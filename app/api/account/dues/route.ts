import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireApprovedMemberAccountAccess } from "@/lib/auth/account-access";
import { getDb } from "@/db/client";
import { duesInvoices, duesPayments, duesSchedules } from "@/db/schema";
import { featureDisabledResponse, isFeatureEnabled } from "@/lib/config/features";

export async function GET() {
  if (!(await isFeatureEnabled("FEATURE_DUES"))) {
    return NextResponse.json(featureDisabledResponse("FEATURE_DUES"), { status: 404 });
  }

  const access = await requireApprovedMemberAccountAccess();
  if ("error" in access) {
    return access.error;
  }

  const db = getDb();

  const schedules = await db
    .select({
      id: duesSchedules.id,
      frequency: duesSchedules.frequency,
      amountCents: duesSchedules.amountCents,
      currency: duesSchedules.currency,
      nextDueDate: duesSchedules.nextDueDate,
      active: duesSchedules.active,
      notes: duesSchedules.notes,
      updatedAt: duesSchedules.updatedAt,
    })
    .from(duesSchedules)
    .where(eq(duesSchedules.userId, access.session.userId))
    .orderBy(desc(duesSchedules.updatedAt));

  const openInvoices = await db
    .select({
      id: duesInvoices.id,
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
    .where(and(eq(duesInvoices.userId, access.session.userId), inArray(duesInvoices.status, ["open", "overdue"])))
    .orderBy(desc(duesInvoices.dueDate));

  const payments = await db
    .select({
      id: duesPayments.id,
      invoiceId: duesPayments.invoiceId,
      amountCents: duesPayments.amountCents,
      currency: duesPayments.currency,
      status: duesPayments.status,
      stripeReceiptUrl: duesPayments.stripeReceiptUrl,
      processedAt: duesPayments.processedAt,
      createdAt: duesPayments.createdAt,
    })
    .from(duesPayments)
    .where(eq(duesPayments.userId, access.session.userId))
    .orderBy(desc(duesPayments.createdAt));

  return NextResponse.json({ schedules, openInvoices, payments });
}
