import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  communicationPreferences,
  contactMethods,
  membershipPipelineEvents,
  people,
  users,
} from "@/db/schema";
import { type PersonStatus, userRoleToPersonStatus } from "@/lib/people/status";
import { normalizeUserEmail } from "@/lib/users/validation";

function splitDisplayName(displayName: string) {
  const trimmed = displayName.trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/g);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}

async function upsertEmailContact(personId: number, email: string) {
  if (!email) return;
  await getDb()
    .insert(contactMethods)
    .values({
      personId,
      type: "email",
      value: email,
      isPrimary: true,
      verifiedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [contactMethods.personId, contactMethods.type, contactMethods.value],
      set: {
        isPrimary: true,
        updatedAt: new Date(),
      },
    });
}

async function ensureCommunicationPreference(personId: number) {
  await getDb()
    .insert(communicationPreferences)
    .values({
      personId,
      emailOptIn: true,
      smsOptIn: false,
      whatsappOptIn: false,
      doNotContact: false,
      quietHoursStart: "",
      quietHoursEnd: "",
      preferredChannel: "email",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();
}

export async function recordMembershipPipelineEvent(input: {
  personId: number;
  actorUserId?: number | null;
  eventType: "lead_created" | "tour_attended" | "invited" | "joined" | "renewed" | "churned" | "status_changed" | "note";
  summary?: string;
  payload?: Record<string, unknown>;
  occurredAt?: Date;
}) {
  await getDb().insert(membershipPipelineEvents).values({
    personId: input.personId,
    actorUserId: input.actorUserId ?? null,
    eventType: input.eventType,
    summary: input.summary?.trim() ?? "",
    payloadJson: input.payload ?? {},
    occurredAt: input.occurredAt ?? new Date(),
    createdAt: new Date(),
  });
}

export async function ensurePersonForUser(input: {
  userId: number;
  source?: string;
  actorUserId?: number | null;
}) {
  const [user] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      city: users.city,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  const status = userRoleToPersonStatus(user.role);
  const email = normalizeUserEmail(user.email);
  const { firstName, lastName } = splitDisplayName(user.displayName);
  const now = new Date();

  const [existing] = await getDb()
    .select({
      id: people.id,
      status: people.status,
    })
    .from(people)
    .where(eq(people.userId, user.id))
    .limit(1);

  const [existingByEmail] = existing
    ? [null]
    : await getDb()
        .select({
          id: people.id,
          status: people.status,
          userId: people.userId,
        })
        .from(people)
        .where(eq(people.email, email))
        .limit(1);

  let personId = existing?.id;
  if (!personId) {
    if (existingByEmail?.id) {
      personId = existingByEmail.id;
      await getDb()
        .update(people)
        .set({
          userId: user.id,
          status,
          firstName,
          lastName,
          displayName: user.displayName,
          city: user.city,
          joinedAt: now,
          updatedAt: now,
        })
        .where(eq(people.id, personId));

      if (existingByEmail.status !== status) {
        await recordMembershipPipelineEvent({
          personId,
          actorUserId: input.actorUserId ?? user.id,
          eventType: "joined",
          summary: "Account linked to existing person",
          payload: { userId: user.id, previousStatus: existingByEmail.status, nextStatus: status },
          occurredAt: now,
        });
      }
      await upsertEmailContact(personId, email);
      await ensureCommunicationPreference(personId);
      return { personId, status };
    }

    const [created] = await getDb()
      .insert(people)
      .values({
        userId: user.id,
        status,
        firstName,
        lastName,
        displayName: user.displayName,
        email,
        phone: "",
        city: user.city,
        notes: "",
        source: input.source ?? "account_signup",
        tags: [],
        invitedAt: null,
        joinedAt: user.createdAt,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: people.id,
      });
    personId = created.id;
    await recordMembershipPipelineEvent({
      personId,
      actorUserId: input.actorUserId ?? user.id,
      eventType: "joined",
      summary: "Account created",
      payload: { userId: user.id, role: user.role },
      occurredAt: now,
    });
  } else {
    await getDb()
      .update(people)
      .set({
        status,
        firstName,
        lastName,
        displayName: user.displayName,
        email,
        city: user.city,
        updatedAt: now,
      })
      .where(eq(people.id, personId));

    if (existing.status !== status) {
      await recordMembershipPipelineEvent({
        personId,
        actorUserId: input.actorUserId ?? null,
        eventType: "status_changed",
        summary: `Status changed to ${status}`,
        payload: { previousStatus: existing.status, nextStatus: status },
        occurredAt: now,
      });
    }
  }

  await upsertEmailContact(personId, email);
  await ensureCommunicationPreference(personId);

  return { personId, status };
}

export async function ensurePersonByEmail(input: {
  email: string;
  status: PersonStatus;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  source?: string;
  actorUserId?: number | null;
}) {
  const email = normalizeUserEmail(input.email);
  const now = new Date();
  const [existing] = await getDb()
    .select({
      id: people.id,
      status: people.status,
      city: people.city,
    })
    .from(people)
    .where(eq(people.email, email))
    .limit(1);

  const fallbackName = input.displayName?.trim() || `${input.firstName ?? ""} ${input.lastName ?? ""}`.trim();
  const split = splitDisplayName(fallbackName);
  const firstName = input.firstName?.trim() || split.firstName;
  const lastName = input.lastName?.trim() || split.lastName;
  const displayName = fallbackName || email;

  if (!existing) {
    const [created] = await getDb()
      .insert(people)
      .values({
        userId: null,
        status: input.status,
        firstName,
        lastName,
        displayName,
        email,
        phone: "",
        city: input.city?.trim() ?? "",
        notes: "",
        source: input.source?.trim() || "admin",
        tags: [],
        invitedAt: input.status === "invited" ? now : null,
        joinedAt: null,
        lastContactedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: people.id });
    await upsertEmailContact(created.id, email);
    await ensureCommunicationPreference(created.id);
    await recordMembershipPipelineEvent({
      personId: created.id,
      actorUserId: input.actorUserId ?? null,
      eventType: input.status === "invited" ? "invited" : "lead_created",
      summary: input.status === "invited" ? "Invitation created" : "Lead created",
      payload: { status: input.status, email },
      occurredAt: now,
    });
    return { personId: created.id, status: input.status };
  }

  await getDb()
    .update(people)
    .set({
      status: input.status,
      firstName,
      lastName,
      displayName,
      city: input.city?.trim() ?? existing.city,
      invitedAt: input.status === "invited" ? now : null,
      updatedAt: now,
    })
    .where(eq(people.id, existing.id));

  if (existing.status !== input.status) {
    await recordMembershipPipelineEvent({
      personId: existing.id,
      actorUserId: input.actorUserId ?? null,
      eventType: "status_changed",
      summary: `Status changed to ${input.status}`,
      payload: { previousStatus: existing.status, nextStatus: input.status },
      occurredAt: now,
    });
  }

  await upsertEmailContact(existing.id, email);
  await ensureCommunicationPreference(existing.id);
  return { personId: existing.id, status: input.status };
}

export async function attachPersonToUserByEmail(input: {
  userId: number;
  email: string;
  role: "visitor" | "member" | "admin" | "super_admin";
  actorUserId?: number | null;
}) {
  const email = normalizeUserEmail(input.email);
  const now = new Date();
  const status = userRoleToPersonStatus(input.role);
  const [row] = await getDb()
    .select({
      id: people.id,
      userId: people.userId,
      status: people.status,
    })
    .from(people)
    .where(eq(people.email, email))
    .limit(1);

  if (!row) {
    return ensurePersonForUser({ userId: input.userId, source: "invitation_accept", actorUserId: input.actorUserId });
  }

  await getDb()
    .update(people)
    .set({
      userId: input.userId,
      status,
      joinedAt: now,
      updatedAt: now,
    })
    .where(and(eq(people.id, row.id), eq(people.email, email)));

  if (row.status !== status) {
    await recordMembershipPipelineEvent({
      personId: row.id,
      actorUserId: input.actorUserId ?? null,
      eventType: "joined",
      summary: "Invitation accepted and account linked",
      payload: { previousStatus: row.status, nextStatus: status, userId: input.userId },
      occurredAt: now,
    });
  }

  await ensureCommunicationPreference(row.id);
  await upsertEmailContact(row.id, email);
  return { personId: row.id, status };
}
