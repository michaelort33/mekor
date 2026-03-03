import { and, asc, eq, inArray, isNull, lt, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { duesInvoices, duesPayments, households } from "@/db/schema";

export function invoiceOutstandingCents(amountCents: number, paidCents: number) {
  return Math.max(amountCents - paidCents, 0);
}

export async function getHouseholdInvoiceTotals(householdIds?: number[]) {
  const db = getDb();

  const invoiceRows = await db
    .select({
      householdId: duesInvoices.householdId,
      totalAmountCents: sql<number>`COALESCE(SUM(${duesInvoices.amountCents}), 0)`,
      totalPaidCents: sql<number>`COALESCE(SUM(${duesInvoices.paidCents}), 0)`,
    })
    .from(duesInvoices)
    .where(householdIds?.length ? inArray(duesInvoices.householdId, householdIds) : undefined)
    .groupBy(duesInvoices.householdId);

  const creditRows = await db
    .select({
      householdId: duesPayments.householdId,
      unlinkedCreditsCents: sql<number>`COALESCE(SUM(${duesPayments.amountCents}), 0)`,
    })
    .from(duesPayments)
    .where(
      and(
        isNull(duesPayments.invoiceId),
        householdIds?.length ? inArray(duesPayments.householdId, householdIds) : undefined,
      ),
    )
    .groupBy(duesPayments.householdId);

  const creditsByHousehold = new Map<number, number>();
  for (const row of creditRows) {
    creditsByHousehold.set(row.householdId, row.unlinkedCreditsCents);
  }

  return invoiceRows.map((row) => {
    const unlinkedCreditsCents = creditsByHousehold.get(row.householdId) ?? 0;
    const outstandingCents = Math.max(row.totalAmountCents - row.totalPaidCents - unlinkedCreditsCents, 0);
    return {
      householdId: row.householdId,
      totalAmountCents: row.totalAmountCents,
      totalPaidCents: row.totalPaidCents,
      unlinkedCreditsCents,
      outstandingCents,
    };
  });
}

export async function getOverdueHouseholds() {
  const db = getDb();
  const now = new Date();

  const rows = await db
    .select({
      householdId: duesInvoices.householdId,
      householdName: households.name,
      billingEmail: households.billingEmail,
      overdueCents:
        sql<number>`COALESCE(SUM(CASE WHEN ${duesInvoices.amountCents} - ${duesInvoices.paidCents} > 0 THEN ${duesInvoices.amountCents} - ${duesInvoices.paidCents} ELSE 0 END), 0)`,
      oldestDueDate: sql<Date | null>`MIN(${duesInvoices.dueDate})`,
    })
    .from(duesInvoices)
    .innerJoin(households, eq(households.id, duesInvoices.householdId))
    .where(
      and(
        inArray(duesInvoices.status, ["open", "partially_paid"]),
        lt(duesInvoices.dueDate, now),
      ),
    )
    .groupBy(duesInvoices.householdId, households.name, households.billingEmail)
    .orderBy(asc(sql`MIN(${duesInvoices.dueDate})`));

  return rows.filter((row) => row.overdueCents > 0);
}

export async function recomputeInvoiceStatus(invoiceId: number) {
  const db = getDb();
  const [invoice] = await db
    .select({
      id: duesInvoices.id,
      amountCents: duesInvoices.amountCents,
      paidCents: duesInvoices.paidCents,
      status: duesInvoices.status,
    })
    .from(duesInvoices)
    .where(eq(duesInvoices.id, invoiceId))
    .limit(1);

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const outstanding = invoiceOutstandingCents(invoice.amountCents, invoice.paidCents);
  const nextStatus =
    outstanding === 0
      ? "paid"
      : invoice.paidCents > 0
        ? "partially_paid"
        : "open";

  if (nextStatus === invoice.status) {
    return { ...invoice, outstandingCents: outstanding };
  }

  const [updated] = await db
    .update(duesInvoices)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(eq(duesInvoices.id, invoiceId))
    .returning({
      id: duesInvoices.id,
      amountCents: duesInvoices.amountCents,
      paidCents: duesInvoices.paidCents,
      status: duesInvoices.status,
    });

  if (!updated) {
    throw new Error("Failed to update invoice status");
  }

  return {
    ...updated,
    outstandingCents: invoiceOutstandingCents(updated.amountCents, updated.paidCents),
  };
}
