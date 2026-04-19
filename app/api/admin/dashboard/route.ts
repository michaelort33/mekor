import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import {
  adminAuditLog,
  duesInvoices,
  duesPayments,
  membershipApplications,
  people,
  userInvitations,
  users,
} from "@/db/schema";
import { requireAdminActor } from "@/lib/admin/actor";

export const dynamic = "force-dynamic";

export type AdminDashboardKpis = {
  people: {
    total: number;
    leads: number;
    members: number;
    addedLast30d: number;
  };
  applications: {
    pending: number;
  };
  dues: {
    openCount: number;
    overdueCount: number;
    openCents: number;
  };
  payments: {
    last30dCount: number;
    last30dCents: number;
  };
  invitations: {
    outstanding: number;
  };
  audit: {
    last7dCount: number;
  };
  generatedAt: string;
};

export async function GET() {
  const adminResult = await requireAdminActor();
  if (adminResult instanceof NextResponse) return adminResult;

  const db = getDb();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const today = now.toISOString().slice(0, 10);

  const [
    peopleTotalsRow,
    peopleAddedRow,
    pendingAppsRow,
    openInvoicesRow,
    overdueInvoicesRow,
    paymentsRow,
    invitationsRow,
    auditRow,
  ] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        leads: sql<number>`count(*) filter (where ${people.status} = 'lead')::int`,
        members: sql<number>`count(*) filter (where ${people.status} in ('member','admin','super_admin'))::int`,
      })
      .from(people)
      .then((rows) => rows[0] ?? { total: 0, leads: 0, members: 0 }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(people)
      .where(gte(people.createdAt, thirtyDaysAgo))
      .then((rows) => rows[0] ?? { count: 0 }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(membershipApplications)
      .where(eq(membershipApplications.status, "pending"))
      .then((rows) => rows[0] ?? { count: 0 }),
    db
      .select({
        count: sql<number>`count(*)::int`,
        cents: sql<number>`coalesce(sum(${duesInvoices.amountCents}),0)::int`,
      })
      .from(duesInvoices)
      .where(eq(duesInvoices.status, "open"))
      .then((rows) => rows[0] ?? { count: 0, cents: 0 }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(duesInvoices)
      .where(and(eq(duesInvoices.status, "open"), sql`${duesInvoices.dueDate} < ${today}`))
      .then((rows) => rows[0] ?? { count: 0 }),
    db
      .select({
        count: sql<number>`count(*)::int`,
        cents: sql<number>`coalesce(sum(${duesPayments.amountCents}),0)::int`,
      })
      .from(duesPayments)
      .where(and(eq(duesPayments.status, "succeeded"), gte(duesPayments.createdAt, thirtyDaysAgo)))
      .then((rows) => rows[0] ?? { count: 0, cents: 0 }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(userInvitations)
      .where(and(isNull(userInvitations.acceptedAt), isNull(userInvitations.revokedAt)))
      .then((rows) => rows[0] ?? { count: 0 }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(adminAuditLog)
      .where(gte(adminAuditLog.createdAt, sevenDaysAgo))
      .then((rows) => rows[0] ?? { count: 0 }),
  ]);

  void users;

  const body: AdminDashboardKpis = {
    people: {
      total: peopleTotalsRow.total,
      leads: peopleTotalsRow.leads,
      members: peopleTotalsRow.members,
      addedLast30d: peopleAddedRow.count,
    },
    applications: { pending: pendingAppsRow.count },
    dues: {
      openCount: openInvoicesRow.count,
      overdueCount: overdueInvoicesRow.count,
      openCents: openInvoicesRow.cents,
    },
    payments: {
      last30dCount: paymentsRow.count,
      last30dCents: paymentsRow.cents,
    },
    invitations: { outstanding: invitationsRow.count },
    audit: { last7dCount: auditRow.count },
    generatedAt: now.toISOString(),
  };

  return NextResponse.json(body);
}
