import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  committeeInterests,
  volunteerOpportunities,
  volunteerSlotSignups,
  volunteerSlots,
} from "@/db/schema";

export async function getVolunteerSlots() {
  const db = getDb();
  const now = new Date();

  const slots = await db
    .select({
      id: volunteerSlots.id,
      opportunityId: volunteerSlots.opportunityId,
      opportunityName: volunteerOpportunities.name,
      label: volunteerSlots.label,
      startAt: volunteerSlots.startAt,
      endAt: volunteerSlots.endAt,
      capacity: volunteerSlots.capacity,
      signupOpen: volunteerSlots.signupOpen,
      location: volunteerSlots.location,
    })
    .from(volunteerSlots)
    .innerJoin(volunteerOpportunities, eq(volunteerOpportunities.id, volunteerSlots.opportunityId))
    .where(and(eq(volunteerOpportunities.isActive, true), gte(volunteerSlots.startAt, now)))
    .orderBy(asc(volunteerSlots.startAt));

  if (slots.length === 0) {
    return [];
  }

  const slotIds = slots.map((slot) => slot.id);
  const counts = await db
    .select({
      slotId: volunteerSlotSignups.slotId,
      status: volunteerSlotSignups.status,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(volunteerSlotSignups)
    .where(inArray(volunteerSlotSignups.slotId, slotIds))
    .groupBy(volunteerSlotSignups.slotId, volunteerSlotSignups.status);

  const countMap = new Map<number, { confirmed: number; waitlisted: number }>();
  for (const row of counts) {
    const current = countMap.get(row.slotId) ?? { confirmed: 0, waitlisted: 0 };
    if (row.status === "confirmed") {
      current.confirmed = row.count;
    }
    if (row.status === "waitlisted") {
      current.waitlisted = row.count;
    }
    countMap.set(row.slotId, current);
  }

  return slots.map((slot) => {
    const stats = countMap.get(slot.id) ?? { confirmed: 0, waitlisted: 0 };
    return {
      ...slot,
      confirmedCount: stats.confirmed,
      waitlistedCount: stats.waitlisted,
      remaining: slot.capacity - stats.confirmed,
    };
  });
}

export async function signupVolunteerSlot(input: {
  slotId: number;
  memberId?: number;
  name: string;
  email: string;
  phone: string;
  note: string;
  committeeInterests: string[];
}) {
  const db = getDb();

  const [slot] = await db
    .select({
      id: volunteerSlots.id,
      capacity: volunteerSlots.capacity,
      signupOpen: volunteerSlots.signupOpen,
    })
    .from(volunteerSlots)
    .where(eq(volunteerSlots.id, input.slotId))
    .limit(1);

  if (!slot || !slot.signupOpen) {
    throw new Error("Volunteer slot is not available for signup");
  }

  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(volunteerSlotSignups)
    .where(and(eq(volunteerSlotSignups.slotId, slot.id), eq(volunteerSlotSignups.status, "confirmed")));

  const confirmedCount = countRow?.count ?? 0;
  const nextStatus = confirmedCount < slot.capacity ? "confirmed" : "waitlisted";
  const now = new Date();

  const [signup] = await db
    .insert(volunteerSlotSignups)
    .values({
      slotId: input.slotId,
      memberId: input.memberId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      note: input.note,
      status: nextStatus,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [volunteerSlotSignups.slotId, volunteerSlotSignups.email],
      set: {
        memberId: input.memberId,
        name: input.name,
        phone: input.phone,
        note: input.note,
        status: nextStatus,
        updatedAt: now,
      },
    })
    .returning({
      id: volunteerSlotSignups.id,
      status: volunteerSlotSignups.status,
      slotId: volunteerSlotSignups.slotId,
      createdAt: volunteerSlotSignups.createdAt,
    });

  if (!signup) {
    throw new Error("Failed to create volunteer signup");
  }

  for (const committee of input.committeeInterests) {
    await db.insert(committeeInterests).values({
      memberId: input.memberId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      committee,
      note: input.note,
      updatedAt: now,
    });
  }

  return signup;
}
