import { and, desc, eq, inArray, isNull, lt, max, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { duesInvoices, duesPayments, duesReminderLog, users } from "@/db/schema";
import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import { featureDisabledResponse, isFeatureEnabled } from "@/lib/config/features";
import { getManualPaymentStatusForInvoiceTransition } from "@/lib/dues/admin-invoices";
import { sendDuesNotification } from "@/lib/dues/notifications";
import { decodeCursor, parsePageLimit, toPaginatedResult } from "@/lib/pagination/cursor";

const DUES_INVOICE_STATUSES = ["open", "paid", "void", "overdue"] as const;

const updateSchema = z.object({
  id: z.number().int().min(1),
  label: z.string().trim().min(1).max(160).optional(),
  amountCents: z.number().int().min(1).optional(),
  dueDate: z.string().trim().min(1).optional(),
  status: z.enum(["open", "paid", "void", "overdue"]),
});

const invoiceCursorSchema = z.object({
  dueDate: z.string(),
  id: z.number().int().min(1),
});

export async function GET(request: Request) {
  if (!(await isFeatureEnabled("FEATURE_DUES"))) {
    return NextResponse.json(featureDisabledResponse("FEATURE_DUES"), { status: 404 });
  }

  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const url = new URL(request.url);
  const userId = Number(url.searchParams.get("userId") || "0");
  const status = url.searchParams.get("status")?.trim();
  const limit = parsePageLimit(url.searchParams.get("limit"));
  const parsedCursor = decodeCursor(url.searchParams.get("cursor"), invoiceCursorSchema);
  if (parsedCursor.error) {
    return NextResponse.json({ error: parsedCursor.error }, { status: 400 });
  }
  const cursor = parsedCursor.value;

  if (status && !DUES_INVOICE_STATUSES.includes(status as (typeof DUES_INVOICE_STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
  }

  const whereClause = and(
    Number.isInteger(userId) && userId > 0 ? eq(duesInvoices.userId, userId) : undefined,
    status ? eq(duesInvoices.status, status as "open" | "paid" | "void" | "overdue") : undefined,
    cursor
      ? or(
          lt(duesInvoices.dueDate, cursor.dueDate),
          and(eq(duesInvoices.dueDate, cursor.dueDate), lt(duesInvoices.id, cursor.id)),
        )
      : undefined,
  );

  const rows = await getDb()
    .select({
      id: duesInvoices.id,
      userId: duesInvoices.userId,
      userEmail: users.email,
      userDisplayName: users.displayName,
      label: duesInvoices.label,
      amountCents: duesInvoices.amountCents,
      currency: duesInvoices.currency,
      dueDate: duesInvoices.dueDate,
      status: duesInvoices.status,
      paidAt: duesInvoices.paidAt,
      stripeReceiptUrl: duesInvoices.stripeReceiptUrl,
      updatedAt: duesInvoices.updatedAt,
    })
    .from(duesInvoices)
    .innerJoin(users, eq(users.id, duesInvoices.userId))
    .where(whereClause)
    .orderBy(desc(duesInvoices.dueDate), desc(duesInvoices.id))
    .limit(limit + 1);

  const { items, pageInfo } = toPaginatedResult(rows, limit, (row) => ({
    dueDate: row.dueDate,
    id: row.id,
  }));

  const invoiceIds = items.map((item) => item.id);
  const reminderRows =
    invoiceIds.length === 0
      ? []
      : await getDb()
          .select({
            invoiceId: duesReminderLog.invoiceId,
            reminderCount: sql<number>`count(*)::int`,
            lastReminderSentAt: max(duesReminderLog.sentAt),
          })
          .from(duesReminderLog)
          .where(inArray(duesReminderLog.invoiceId, invoiceIds))
          .groupBy(duesReminderLog.invoiceId);
  const remindersByInvoiceId = new Map(
    reminderRows.map((row) => [
      row.invoiceId,
      {
        reminderCount: Number(row.reminderCount),
        lastReminderSentAt: row.lastReminderSentAt ? row.lastReminderSentAt.toISOString() : null,
      },
    ]),
  );

  return NextResponse.json({
    items: items.map((item) => ({
      ...item,
      reminderCount: remindersByInvoiceId.get(item.id)?.reminderCount ?? 0,
      lastReminderSentAt: remindersByInvoiceId.get(item.id)?.lastReminderSentAt ?? null,
    })),
    pageInfo,
  });
}

export async function PUT(request: Request) {
  if (!(await isFeatureEnabled("FEATURE_DUES"))) {
    return NextResponse.json(featureDisabledResponse("FEATURE_DUES"), { status: 404 });
  }

  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;
  const actor = adminResult.actor;

  const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date();

  const [current] = await getDb()
    .select({
      id: duesInvoices.id,
      userId: duesInvoices.userId,
      label: duesInvoices.label,
      amountCents: duesInvoices.amountCents,
      currency: duesInvoices.currency,
      dueDate: duesInvoices.dueDate,
      status: duesInvoices.status,
      paidAt: duesInvoices.paidAt,
      stripeCheckoutSessionId: duesInvoices.stripeCheckoutSessionId,
      stripePaymentIntentId: duesInvoices.stripePaymentIntentId,
      userEmail: users.email,
      userDisplayName: users.displayName,
    })
    .from(duesInvoices)
    .innerJoin(users, eq(users.id, duesInvoices.userId))
    .where(eq(duesInvoices.id, parsed.data.id))
    .limit(1);

  if (!current) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const paidAt =
    parsed.data.status === "paid"
      ? current.status === "paid" && current.paidAt
        ? current.paidAt
        : now
      : null;

  const [updated] = await getDb()
    .update(duesInvoices)
    .set({
      label: parsed.data.label,
      amountCents: parsed.data.amountCents,
      dueDate: parsed.data.dueDate,
      status: parsed.data.status,
      paidAt,
      updatedAt: now,
    })
    .where(eq(duesInvoices.id, parsed.data.id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const nextStatus = parsed.data.status;
  const manualPaymentStatus = getManualPaymentStatusForInvoiceTransition({
    previousStatus: current.status,
    nextStatus,
  });

  const [latestManualPayment] = await getDb()
    .select({
      id: duesPayments.id,
      status: duesPayments.status,
    })
    .from(duesPayments)
    .where(
      and(
        eq(duesPayments.invoiceId, current.id),
        isNull(duesPayments.stripeCheckoutSessionId),
        isNull(duesPayments.stripePaymentIntentId),
      ),
    )
    .orderBy(desc(duesPayments.createdAt), desc(duesPayments.id))
    .limit(1);

  let manualPaymentId: number | null = null;
  if (manualPaymentStatus === "succeeded") {
    const [createdPayment] = await getDb()
      .insert(duesPayments)
      .values({
        userId: current.userId,
        invoiceId: current.id,
        amountCents: updated.amountCents,
        currency: updated.currency,
        status: "succeeded",
        stripeCheckoutSessionId: null,
        stripePaymentIntentId: null,
        stripeReceiptUrl: "",
        processedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: duesPayments.id });
    manualPaymentId = createdPayment.id;

    await sendDuesNotification({
      referenceKey: `payment:${manualPaymentId}:payment_succeeded`,
      userId: current.userId,
      userEmail: current.userEmail,
      displayName: current.userDisplayName,
      notificationType: "payment_succeeded",
      invoiceId: current.id,
      paymentId: manualPaymentId,
      invoiceLabel: updated.label,
      amountCents: updated.amountCents,
      currency: updated.currency,
      dueDate: updated.dueDate,
    });
  }

  if (manualPaymentStatus && manualPaymentStatus !== "succeeded" && latestManualPayment) {
    await getDb()
      .update(duesPayments)
      .set({
        amountCents: updated.amountCents,
        currency: updated.currency,
        status: manualPaymentStatus,
        processedAt: now,
        updatedAt: now,
      })
      .where(eq(duesPayments.id, latestManualPayment.id));
    manualPaymentId = latestManualPayment.id;
  }

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "dues.invoice.updated",
    targetType: "dues_invoice",
    targetId: String(updated.id),
    payload: {
      previousStatus: current.status,
      nextStatus: updated.status,
      amountCents: updated.amountCents,
      dueDate: updated.dueDate,
      manualPaymentId,
    },
  });

  return NextResponse.json({ invoice: updated });
}
