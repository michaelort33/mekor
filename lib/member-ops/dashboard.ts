import { and, asc, eq, gte, inArray, lt, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  eventRsvps,
  events,
  memberMessageRequests,
  membershipTerms,
  renewalStatusEnum,
  volunteerSlotSignups,
  volunteerSlots,
} from "@/db/schema";
import type { DashboardSummary } from "@/lib/member-ops/contracts";
import { getOverdueHouseholds } from "@/lib/member-ops/dues";

const ALL_RENEWAL_STATUSES = renewalStatusEnum.enumValues;

function currentCycleLabel(anchor: Date) {
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  const startYear = month >= 8 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const db = getDb();
  const now = new Date();
  const thirtyDaysOut = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);

  const overdueHouseholds = await getOverdueHouseholds();

  const currentCycle = currentCycleLabel(now);
  const renewalCountRows = await db
    .select({
      renewalStatus: membershipTerms.renewalStatus,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(membershipTerms)
    .where(eq(membershipTerms.cycleLabel, currentCycle))
    .groupBy(membershipTerms.renewalStatus);

  const renewalCounts = ALL_RENEWAL_STATUSES.reduce<Record<string, number>>((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

  for (const row of renewalCountRows) {
    renewalCounts[row.renewalStatus] = row.count;
  }

  const upcomingEvents = await db
    .select({
      path: events.path,
      title: events.title,
      startAt: events.startAt,
    })
    .from(events)
    .where(and(gte(events.startAt, now), lt(events.startAt, thirtyDaysOut)))
    .orderBy(asc(events.startAt));

  const rsvpCountsByPath = new Map<string, number>();
  if (upcomingEvents.length > 0) {
    const paths = upcomingEvents.map((event) => event.path);
    const rows = await db
      .select({
        eventPath: eventRsvps.eventPath,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(eventRsvps)
      .where(inArray(eventRsvps.eventPath, paths))
      .groupBy(eventRsvps.eventPath);

    for (const row of rows) {
      rsvpCountsByPath.set(row.eventPath, row.count);
    }
  }

  const volunteerStatRows = await db
    .select({
      slotId: volunteerSlots.id,
      label: volunteerSlots.label,
      startAt: volunteerSlots.startAt,
      capacity: volunteerSlots.capacity,
      status: volunteerSlotSignups.status,
      count: sql<number>`COUNT(${volunteerSlotSignups.id})::int`,
    })
    .from(volunteerSlots)
    .leftJoin(volunteerSlotSignups, eq(volunteerSlotSignups.slotId, volunteerSlots.id))
    .where(gte(volunteerSlots.startAt, now))
    .groupBy(volunteerSlots.id, volunteerSlots.label, volunteerSlots.startAt, volunteerSlots.capacity, volunteerSlotSignups.status)
    .orderBy(asc(volunteerSlots.startAt));

  const volunteerBySlot = new Map<number, { slotId: number; label: string; startAt: Date; capacity: number; confirmedCount: number; waitlistedCount: number }>();
  for (const row of volunteerStatRows) {
    const current =
      volunteerBySlot.get(row.slotId) ?? {
        slotId: row.slotId,
        label: row.label,
        startAt: row.startAt,
        capacity: row.capacity,
        confirmedCount: 0,
        waitlistedCount: 0,
      };

    if (row.status === "confirmed") {
      current.confirmedCount = row.count;
    }
    if (row.status === "waitlisted") {
      current.waitlistedCount = row.count;
    }

    volunteerBySlot.set(row.slotId, current);
  }

  const pendingMessageRequests = await db
    .select({
      id: memberMessageRequests.id,
      senderName: memberMessageRequests.senderName,
      recipientDisplayName: memberMessageRequests.recipientDisplayName,
      subject: memberMessageRequests.subject,
      createdAt: memberMessageRequests.createdAt,
    })
    .from(memberMessageRequests)
    .where(eq(memberMessageRequests.status, "pending_review"))
    .orderBy(asc(memberMessageRequests.createdAt));

  return {
    overdueHouseholds,
    renewalCounts: {
      not_started: renewalCounts.not_started ?? 0,
      invited: renewalCounts.invited ?? 0,
      form_submitted: renewalCounts.form_submitted ?? 0,
      payment_pending: renewalCounts.payment_pending ?? 0,
      active: renewalCounts.active ?? 0,
      on_hold: renewalCounts.on_hold ?? 0,
    },
    upcomingEvents: upcomingEvents.map((event) => ({
      path: event.path,
      title: event.title,
      startAt: event.startAt,
      rsvpCount: rsvpCountsByPath.get(event.path) ?? 0,
    })),
    volunteerSlotStats: [...volunteerBySlot.values()],
    pendingMessageRequests,
  };
}
