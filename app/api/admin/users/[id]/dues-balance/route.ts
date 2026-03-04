import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { duesInvoices, users } from "@/db/schema";
import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import { featureDisabledResponse, isFeatureEnabled } from "@/lib/config/features";
import { sendDuesNotification } from "@/lib/dues/notifications";

const adjustmentSchema = z.object({
  adjustmentCents: z.number().int().refine((value) => value !== 0, "adjustmentCents cannot be zero"),
  reason: z.string().trim().min(3).max(160),
});

const createInvoiceSchema = z.object({
  label: z.string().trim().min(1).max(160),
  amountCents: z.number().int().min(1),
  dueDate: z.string().trim().min(1),
  currency: z.string().trim().length(3).default("usd"),
});

const requestSchema = z
  .object({
    adjustmentCents: z.number().int().optional(),
    reason: z.string().trim().optional(),
    createInvoice: createInvoiceSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const hasAdjustment = typeof value.adjustmentCents === "number";
    const hasCreateInvoice = Boolean(value.createInvoice);

    if (!hasAdjustment && !hasCreateInvoice) {
      ctx.addIssue({ code: "custom", message: "Provide adjustmentCents/reason or createInvoice" });
      return;
    }
    if (hasAdjustment && !value.reason) {
      ctx.addIssue({ code: "custom", message: "reason is required for adjustment" });
    }
    if (hasAdjustment && hasCreateInvoice) {
      ctx.addIssue({ code: "custom", message: "Use either adjustment or createInvoice, not both" });
    }
  });

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  if (!(await isFeatureEnabled("FEATURE_DUES"))) {
    return NextResponse.json(featureDisabledResponse("FEATURE_DUES"), { status: 404 });
  }

  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;
  const actor = adminResult.actor;

  const userId = Number.parseInt((await context.params).id, 10);
  if (!Number.isInteger(userId) || userId < 1) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const [targetUser] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date();
  let label = "";
  let amountCents = 0;
  let dueDate = "";
  let currency = "usd";
  let action: "dues.invoice.created" | "dues.balance.adjusted";

  if (parsed.data.createInvoice) {
    const invoiceInput = createInvoiceSchema.parse(parsed.data.createInvoice);
    label = invoiceInput.label;
    amountCents = invoiceInput.amountCents;
    dueDate = invoiceInput.dueDate;
    currency = invoiceInput.currency.toLowerCase();
    action = "dues.invoice.created";
  } else {
    const adjustmentInput = adjustmentSchema.parse({
      adjustmentCents: parsed.data.adjustmentCents,
      reason: parsed.data.reason,
    });
    label = `Balance adjustment: ${adjustmentInput.reason}`;
    amountCents = adjustmentInput.adjustmentCents;
    dueDate = now.toISOString().slice(0, 10);
    currency = "usd";
    action = "dues.balance.adjusted";
  }

  const [invoice] = await getDb()
    .insert(duesInvoices)
    .values({
      userId,
      label,
      amountCents,
      dueDate,
      currency,
      status: "open",
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: duesInvoices.id,
      userId: duesInvoices.userId,
      label: duesInvoices.label,
      amountCents: duesInvoices.amountCents,
      dueDate: duesInvoices.dueDate,
      currency: duesInvoices.currency,
      status: duesInvoices.status,
    });

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action,
    targetType: "dues_invoice",
    targetId: String(invoice.id),
    payload: {
      userId,
      userEmail: targetUser.email,
      amountCents: invoice.amountCents,
      label: invoice.label,
      dueDate: invoice.dueDate,
      currency: invoice.currency,
    },
  });

  if (invoice.amountCents > 0) {
    await sendDuesNotification({
      referenceKey: `invoice:${invoice.id}:invoice_created`,
      userId: targetUser.id,
      userEmail: targetUser.email,
      displayName: targetUser.displayName,
      notificationType: "invoice_created",
      invoiceId: invoice.id,
      paymentId: null,
      invoiceLabel: invoice.label,
      amountCents: invoice.amountCents,
      currency: invoice.currency,
      dueDate: invoice.dueDate,
    });
  }

  return NextResponse.json({ invoice });
}
