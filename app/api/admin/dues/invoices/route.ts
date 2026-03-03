import { and, asc, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { duesInvoices, users } from "@/db/schema";
import { getAdminSession } from "@/lib/admin/session";
import { featureDisabledResponse, isFeatureEnabled } from "@/lib/config/features";

const DUES_INVOICE_STATUSES = ["open", "paid", "void", "overdue"] as const;

const updateSchema = z.object({
  id: z.number().int().min(1),
  label: z.string().trim().min(1).max(160).optional(),
  amountCents: z.number().int().min(1).optional(),
  dueDate: z.string().trim().min(1).optional(),
  status: z.enum(["open", "paid", "void", "overdue"]),
});

async function requireAdmin() {
  const hasSession = await getAdminSession();
  if (!hasSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

export async function GET(request: Request) {
  if (!isFeatureEnabled("FEATURE_DUES")) {
    return NextResponse.json(featureDisabledResponse("FEATURE_DUES"), { status: 404 });
  }

  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const userId = Number(url.searchParams.get("userId") || "0");
  const status = url.searchParams.get("status")?.trim();
  if (status && !DUES_INVOICE_STATUSES.includes(status as (typeof DUES_INVOICE_STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
  }

  const whereClause = and(
    Number.isInteger(userId) && userId > 0 ? eq(duesInvoices.userId, userId) : undefined,
    status ? eq(duesInvoices.status, status as "open" | "paid" | "void" | "overdue") : undefined,
  );

  const invoices = await getDb()
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
    .orderBy(desc(duesInvoices.dueDate), asc(users.displayName));

  return NextResponse.json({ invoices });
}

export async function PUT(request: Request) {
  if (!isFeatureEnabled("FEATURE_DUES")) {
    return NextResponse.json(featureDisabledResponse("FEATURE_DUES"), { status: 404 });
  }

  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = await getDb()
    .update(duesInvoices)
    .set({
      label: parsed.data.label,
      amountCents: parsed.data.amountCents,
      dueDate: parsed.data.dueDate,
      status: parsed.data.status,
      paidAt: parsed.data.status === "paid" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(duesInvoices.id, parsed.data.id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json({ invoice: updated });
}
