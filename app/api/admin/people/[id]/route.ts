import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import {
  communicationPreferences,
  contactMethods,
  duesInvoices,
  membershipPipelineEvents,
  messageDeliveries,
  messageCampaigns,
  messageSuppressions,
  people,
  userInvitations,
  users,
} from "@/db/schema";
import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import { normalizeUserEmail } from "@/lib/users/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const PEOPLE_STATUSES = ["lead", "invited", "visitor", "guest", "member", "admin", "super_admin", "inactive"] as const;
const statusSchema = z.enum(PEOPLE_STATUSES);

const updatePersonSchema = z.object({
  status: statusSchema,
  firstName: z.string().trim().max(120),
  lastName: z.string().trim().max(120),
  displayName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(60),
  city: z.string().trim().max(120),
  notes: z.string().trim().max(4000),
  source: z.string().trim().max(120),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  preferences: z.object({
    emailOptIn: z.boolean(),
    smsOptIn: z.boolean(),
    whatsappOptIn: z.boolean(),
    doNotContact: z.boolean(),
    quietHoursStart: z.string().trim().max(5),
    quietHoursEnd: z.string().trim().max(5),
    preferredChannel: z.enum(["email", "sms", "whatsapp"]),
  }),
});

function parsePersonId(rawId: string) {
  const personId = Number.parseInt(rawId, 10);
  if (!Number.isInteger(personId) || personId < 1) {
    return null;
  }
  return personId;
}

function personStatusToUserRole(status: z.infer<typeof statusSchema>) {
  if (status === "visitor" || status === "member" || status === "admin" || status === "super_admin") {
    return status;
  }
  return null;
}

export async function GET(_request: Request, context: RouteContext) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const personId = parsePersonId((await context.params).id);
  if (!personId) {
    return NextResponse.json({ error: "Invalid person id" }, { status: 400 });
  }

  const [personRow] = await getDb()
    .select({
      id: people.id,
      userId: people.userId,
      status: people.status,
      firstName: people.firstName,
      lastName: people.lastName,
      displayName: people.displayName,
      email: people.email,
      phone: people.phone,
      city: people.city,
      notes: people.notes,
      source: people.source,
      tags: people.tags,
      invitedAt: people.invitedAt,
      joinedAt: people.joinedAt,
      lastContactedAt: people.lastContactedAt,
      createdAt: people.createdAt,
      updatedAt: people.updatedAt,
      role: users.role,
      emailOptIn: communicationPreferences.emailOptIn,
      smsOptIn: communicationPreferences.smsOptIn,
      whatsappOptIn: communicationPreferences.whatsappOptIn,
      doNotContact: communicationPreferences.doNotContact,
      quietHoursStart: communicationPreferences.quietHoursStart,
      quietHoursEnd: communicationPreferences.quietHoursEnd,
      preferredChannel: communicationPreferences.preferredChannel,
    })
    .from(people)
    .leftJoin(users, eq(users.id, people.userId))
    .leftJoin(communicationPreferences, eq(communicationPreferences.personId, people.id))
    .where(eq(people.id, personId))
    .limit(1);

  if (!personRow) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }

  const contacts = await getDb()
    .select({
      id: contactMethods.id,
      type: contactMethods.type,
      value: contactMethods.value,
      isPrimary: contactMethods.isPrimary,
      verifiedAt: contactMethods.verifiedAt,
      createdAt: contactMethods.createdAt,
    })
    .from(contactMethods)
    .where(eq(contactMethods.personId, personId))
    .orderBy(desc(contactMethods.isPrimary), desc(contactMethods.createdAt));

  const timeline = await getDb()
    .select({
      id: membershipPipelineEvents.id,
      eventType: membershipPipelineEvents.eventType,
      summary: membershipPipelineEvents.summary,
      payloadJson: membershipPipelineEvents.payloadJson,
      occurredAt: membershipPipelineEvents.occurredAt,
      createdAt: membershipPipelineEvents.createdAt,
      actorUserId: membershipPipelineEvents.actorUserId,
    })
    .from(membershipPipelineEvents)
    .where(eq(membershipPipelineEvents.personId, personId))
    .orderBy(desc(membershipPipelineEvents.occurredAt), desc(membershipPipelineEvents.id))
    .limit(80);

  const invitations = await getDb()
    .select({
      id: userInvitations.id,
      email: userInvitations.email,
      role: userInvitations.role,
      invitedByUserId: userInvitations.invitedByUserId,
      expiresAt: userInvitations.expiresAt,
      acceptedAt: userInvitations.acceptedAt,
      revokedAt: userInvitations.revokedAt,
      createdAt: userInvitations.createdAt,
    })
    .from(userInvitations)
    .where(eq(userInvitations.email, personRow.email))
    .orderBy(desc(userInvitations.createdAt), desc(userInvitations.id))
    .limit(40);

  const deliveries = await getDb()
    .select({
      id: messageDeliveries.id,
      campaignId: messageDeliveries.campaignId,
      channel: messageDeliveries.channel,
      recipientEmail: messageDeliveries.recipientEmail,
      status: messageDeliveries.status,
      provider: messageDeliveries.provider,
      providerMessageId: messageDeliveries.providerMessageId,
      errorMessage: messageDeliveries.errorMessage,
      sentAt: messageDeliveries.sentAt,
      createdAt: messageDeliveries.createdAt,
      campaignName: messageCampaigns.name,
    })
    .from(messageDeliveries)
    .innerJoin(messageCampaigns, eq(messageCampaigns.id, messageDeliveries.campaignId))
    .where(eq(messageDeliveries.personId, personId))
    .orderBy(desc(messageDeliveries.createdAt), desc(messageDeliveries.id))
    .limit(40);

  let duesSummary = { outstandingBalanceCents: 0, openCount: 0 };
  if (personRow.userId != null) {
    const [row] = await getDb()
      .select({
        outstandingBalanceCents: sql<number>`COALESCE(SUM(${duesInvoices.amountCents}), 0)`,
        openCount: sql<number>`COUNT(*)::int`,
      })
      .from(duesInvoices)
      .where(and(eq(duesInvoices.userId, personRow.userId), inArray(duesInvoices.status, ["open", "overdue"])));
    duesSummary = {
      outstandingBalanceCents: Number(row?.outstandingBalanceCents ?? 0),
      openCount: Number(row?.openCount ?? 0),
    };
  }

  return NextResponse.json({
    person: {
      ...personRow,
      preferences: {
        emailOptIn: personRow.emailOptIn ?? true,
        smsOptIn: personRow.smsOptIn ?? false,
        whatsappOptIn: personRow.whatsappOptIn ?? false,
        doNotContact: personRow.doNotContact ?? false,
        quietHoursStart: personRow.quietHoursStart ?? "",
        quietHoursEnd: personRow.quietHoursEnd ?? "",
        preferredChannel: personRow.preferredChannel ?? "email",
      },
      dues: duesSummary,
    },
    contacts,
    timeline,
    invitations: invitations.map((invitation) => ({
      ...invitation,
      status: invitation.acceptedAt
        ? "accepted"
        : invitation.revokedAt
          ? "revoked"
          : invitation.expiresAt.getTime() > Date.now()
            ? "active"
            : "expired",
    })),
    deliveries,
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;
  const actor = adminResult.actor;

  const personId = parsePersonId((await context.params).id);
  if (!personId) {
    return NextResponse.json({ error: "Invalid person id" }, { status: 400 });
  }

  const parsed = updatePersonSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  if ((parsed.data.status === "admin" || parsed.data.status === "super_admin") && actor.role !== "super_admin") {
    return NextResponse.json({ error: "Only super admins can assign admin-level statuses" }, { status: 403 });
  }

  const [existing] = await getDb()
    .select({
      id: people.id,
      userId: people.userId,
      status: people.status,
    })
    .from(people)
    .where(eq(people.id, personId))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }

  const normalizedEmail = normalizeUserEmail(parsed.data.email);
  const now = new Date();
  const [updated] = await getDb()
    .update(people)
    .set({
      status: parsed.data.status,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      displayName: parsed.data.displayName,
      email: normalizedEmail,
      phone: parsed.data.phone,
      city: parsed.data.city,
      notes: parsed.data.notes,
      source: parsed.data.source,
      tags: parsed.data.tags,
      invitedAt: parsed.data.status === "invited" ? now : null,
      updatedAt: now,
    })
    .where(eq(people.id, personId))
    .returning({
      id: people.id,
      userId: people.userId,
      status: people.status,
      displayName: people.displayName,
      email: people.email,
      phone: people.phone,
      city: people.city,
      notes: people.notes,
      tags: people.tags,
      updatedAt: people.updatedAt,
    });

  await getDb()
    .insert(communicationPreferences)
    .values({
      personId,
      emailOptIn: parsed.data.preferences.emailOptIn,
      smsOptIn: parsed.data.preferences.smsOptIn,
      whatsappOptIn: parsed.data.preferences.whatsappOptIn,
      doNotContact: parsed.data.preferences.doNotContact,
      quietHoursStart: parsed.data.preferences.quietHoursStart,
      quietHoursEnd: parsed.data.preferences.quietHoursEnd,
      preferredChannel: parsed.data.preferences.preferredChannel,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: communicationPreferences.personId,
      set: {
        emailOptIn: parsed.data.preferences.emailOptIn,
        smsOptIn: parsed.data.preferences.smsOptIn,
        whatsappOptIn: parsed.data.preferences.whatsappOptIn,
        doNotContact: parsed.data.preferences.doNotContact,
        quietHoursStart: parsed.data.preferences.quietHoursStart,
        quietHoursEnd: parsed.data.preferences.quietHoursEnd,
        preferredChannel: parsed.data.preferences.preferredChannel,
        updatedAt: now,
      },
    });

  if (parsed.data.preferences.doNotContact) {
    await getDb()
      .insert(messageSuppressions)
      .values({
        personId,
        channel: "email",
        email: normalizedEmail,
        phone: parsed.data.phone || null,
        reason: "hard_opt_out",
        createdByUserId: actor.id,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();
  }

  await getDb()
    .insert(contactMethods)
    .values({
      personId,
      type: "email",
      value: normalizedEmail,
      isPrimary: true,
      verifiedAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [contactMethods.personId, contactMethods.type, contactMethods.value],
      set: {
        isPrimary: true,
        updatedAt: now,
      },
    });

  if (parsed.data.phone) {
    await getDb()
      .insert(contactMethods)
      .values({
        personId,
        type: "phone",
        value: parsed.data.phone,
        isPrimary: true,
        verifiedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [contactMethods.personId, contactMethods.type, contactMethods.value],
        set: {
          isPrimary: true,
          updatedAt: now,
        },
      });
  }

  const mappedRole = personStatusToUserRole(parsed.data.status);
  if (existing.userId && mappedRole) {
    await getDb()
      .update(users)
      .set({
        role: mappedRole,
        updatedAt: now,
      })
      .where(eq(users.id, existing.userId));
  }

  if (existing.status !== parsed.data.status) {
    await getDb().insert(membershipPipelineEvents).values({
      personId,
      actorUserId: actor.id,
      eventType: "status_changed",
      summary: `Status changed from ${existing.status} to ${parsed.data.status}`,
      payloadJson: {
        previousStatus: existing.status,
        nextStatus: parsed.data.status,
      },
      occurredAt: now,
      createdAt: now,
    });
  }

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "people.updated",
    targetType: "person",
    targetId: String(personId),
    payload: {
      status: parsed.data.status,
      email: normalizedEmail,
      tags: parsed.data.tags,
      doNotContact: parsed.data.preferences.doNotContact,
    },
  });

  return NextResponse.json({ person: updated });
}
