import { and, asc, desc, eq, gt, inArray, lte, ne, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  adminAuditLog,
  duesInvoices,
  families,
  familyInvites,
  familyJoinRequests,
  familyMembers,
  inboxMessages,
  inboxParticipants,
  inboxThreads,
  notificationsOutbox,
  users,
} from "@/db/schema";
import { sendSendGridEmail } from "@/lib/notifications/sendgrid";
import { generateInvitationToken, hashInvitationToken, invitationExpiryFromNow } from "@/lib/invitations/token";
import { normalizeUserEmail } from "@/lib/users/validation";

type UserRole = "visitor" | "member" | "admin" | "super_admin";
type FamilyRole = "primary_adult" | "adult" | "child" | "dependent";

type Actor = {
  id: number;
  email: string;
  displayName: string;
  role: UserRole;
};

type FamilyContext = {
  familyId: number;
  familyName: string;
  familySlug: string;
  familyStatus: "active" | "archived";
  membershipId: number | null;
  membershipRole: FamilyRole | null;
  membershipStatus: "pending" | "active" | "former" | null;
};

type InviteInput = {
  actorUserId: number;
  familyId?: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  roleInFamily?: FamilyRole;
  siteOrigin: string;
};

type DrizzleTx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

export class FamilyServiceError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function fail(status: number, code: string, message: string): never {
  throw new FamilyServiceError(status, code, message);
}

function isAdminRole(role: UserRole) {
  return role === "admin" || role === "super_admin";
}

function clean(value: string | undefined) {
  return (value ?? "").trim();
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function getActor(tx: DrizzleTx, actorUserId: number): Promise<Actor> {
  const [actor] = await tx
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, actorUserId))
    .limit(1);
  if (!actor) {
    fail(404, "ACTOR_NOT_FOUND", "User not found");
  }
  return actor;
}

async function getActiveFamilyContextForUser(tx: DrizzleTx, userId: number): Promise<FamilyContext | null> {
  const [row] = await tx
    .select({
      familyId: families.id,
      familyName: families.name,
      familySlug: families.slug,
      familyStatus: families.status,
      membershipId: familyMembers.id,
      membershipRole: familyMembers.roleInFamily,
      membershipStatus: familyMembers.membershipStatus,
    })
    .from(familyMembers)
    .innerJoin(families, eq(families.id, familyMembers.familyId))
    .where(
      and(
        eq(familyMembers.userId, userId),
        eq(familyMembers.membershipStatus, "active"),
        eq(families.status, "active"),
      ),
    )
    .orderBy(desc(familyMembers.joinedAt))
    .limit(1);

  return row ?? null;
}

async function createFamilyForUser(tx: DrizzleTx, actor: Actor): Promise<FamilyContext> {
  const baseName = `${titleCase(actor.displayName || actor.email.split("@")[0] || "Member")} Household`;
  const baseSlug = slugify(baseName) || "family";
  const slug = `${baseSlug}-${actor.id}-${Date.now().toString(36).slice(-6)}`;
  const now = new Date();

  const [family] = await tx
    .insert(families)
    .values({
      name: baseName,
      slug,
      createdByUserId: actor.id,
      status: "active",
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: families.id,
      name: families.name,
      slug: families.slug,
      status: families.status,
    });

  const [membership] = await tx
    .insert(familyMembers)
    .values({
      familyId: family.id,
      userId: actor.id,
      roleInFamily: "primary_adult",
      membershipStatus: "active",
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: familyMembers.id,
      role: familyMembers.roleInFamily,
      status: familyMembers.membershipStatus,
    });

  await tx.insert(adminAuditLog).values({
    actorUserId: actor.id,
    action: "family.created",
    targetType: "family",
    targetId: String(family.id),
    payloadJson: {
      familyName: family.name,
      createdByUserId: actor.id,
    },
    createdAt: now,
  });

  return {
    familyId: family.id,
    familyName: family.name,
    familySlug: family.slug,
    familyStatus: family.status,
    membershipId: membership.id,
    membershipRole: membership.role,
    membershipStatus: membership.status,
  };
}

async function ensureParticipant(tx: DrizzleTx, threadId: number, userId: number) {
  const now = new Date();
  await tx
    .insert(inboxParticipants)
    .values({
      threadId,
      userId,
      lastReadAt: null,
      muted: false,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [inboxParticipants.threadId, inboxParticipants.userId],
      set: { updatedAt: now },
    });
}

async function insertSystemMessage(
  tx: DrizzleTx,
  input: { threadId: number; body: string; messageType?: "system" | "action"; actionPayloadJson?: Record<string, unknown> },
) {
  const now = new Date();
  await tx.insert(inboxMessages).values({
    threadId: input.threadId,
    senderUserId: null,
    messageType: input.messageType ?? "system",
    body: input.body,
    actionPayloadJson: input.actionPayloadJson ?? {},
    createdAt: now,
    updatedAt: now,
  });
  await tx.update(inboxThreads).set({ updatedAt: now }).where(eq(inboxThreads.id, input.threadId));
}

function normalizeInviteeName(firstName: string, lastName: string, fallbackEmail: string) {
  const first = clean(firstName);
  const last = clean(lastName);
  if (first || last) {
    return {
      firstName: titleCase(first),
      lastName: titleCase(last),
    };
  }
  const fallback = fallbackEmail.split("@")[0] || "Member";
  return {
    firstName: titleCase(fallback),
    lastName: "",
  };
}

async function createFamilyInviteEmailNotification(input: {
  inviteId: number;
  threadId: number;
  actor: Actor;
  familyName: string;
  inviteeEmail: string;
  inviteeName: string;
  actionUrl: string;
}) {
  const db = getDb();
  const now = new Date();
  const subject = `${input.actor.displayName} invited you to join ${input.familyName}`;
  const body = [
    `Shalom ${input.inviteeName},`,
    "",
    `${input.actor.displayName} invited you to join the ${input.familyName} family group on Mekor.`,
    "",
    `Open this link to accept: ${input.actionUrl}`,
    "",
    "If you do not have an account yet, you can sign up and the invite will be applied automatically.",
  ].join("\n");

  const [outbox] = await db
    .insert(notificationsOutbox)
    .values({
      userId: null,
      threadId: input.threadId,
      channel: "email",
      toAddress: input.inviteeEmail,
      subject,
      body,
      provider: "sendgrid",
      status: "queued",
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: notificationsOutbox.id,
    });

  try {
    const sendResult = await sendSendGridEmail({
      to: input.inviteeEmail,
      subject,
      text: body,
      html: `<div style="font-family:Arial,sans-serif;color:#1f3043;line-height:1.6;"><p>Shalom ${input.inviteeName},</p><p>${input.actor.displayName} invited you to join the <strong>${input.familyName}</strong> family group on Mekor.</p><p><a href="${input.actionUrl}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#1f4f78;color:#fff;text-decoration:none;">Accept family invite</a></p><p>If you do not have an account yet, you can sign up and the invite will be applied automatically.</p></div>`,
    });

    await db
      .update(notificationsOutbox)
      .set({
        status: "sent",
        providerMessageId: sendResult.providerMessageId,
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(notificationsOutbox.id, outbox.id));
  } catch (error) {
    await db
      .update(notificationsOutbox)
      .set({
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unable to send notification",
        updatedAt: new Date(),
      })
      .where(eq(notificationsOutbox.id, outbox.id));
  }
}

function buildFamilyInviteActionUrl(input: {
  siteOrigin: string;
  inviteeUserId: number | null;
  rawToken: string;
}) {
  return input.inviteeUserId
    ? `${input.siteOrigin}/login?next=%2Faccount%2Finbox`
    : `${input.siteOrigin}/signup?family_invite_token=${encodeURIComponent(input.rawToken)}`;
}

export async function createFamilyInvite(input: InviteInput) {
  const email = clean(input.email) ? normalizeUserEmail(clean(input.email)) : "";
  const firstNameRaw = clean(input.firstName);
  const lastNameRaw = clean(input.lastName);
  const roleInFamily = input.roleInFamily ?? "adult";

  if (!email && !firstNameRaw && !lastNameRaw) {
    fail(400, "INVITEE_REQUIRED", "Provide an invitee email or a first/last name");
  }

  const result = await getDb().transaction(async (tx) => {
    const now = new Date();
    const actor = await getActor(tx, input.actorUserId);
    let familyContext = await getActiveFamilyContextForUser(tx, actor.id);

    if (!familyContext) {
      familyContext = await createFamilyForUser(tx, actor);
    }

    if (input.familyId && familyContext.familyId !== input.familyId && !isAdminRole(actor.role)) {
      fail(403, "FORBIDDEN_FAMILY", "Only admins can invite users to a different family");
    }

    if (input.familyId && input.familyId !== familyContext.familyId) {
      const [overrideFamily] = await tx
        .select({
          familyId: families.id,
          familyName: families.name,
          familySlug: families.slug,
          familyStatus: families.status,
        })
        .from(families)
        .where(and(eq(families.id, input.familyId), eq(families.status, "active")))
        .limit(1);
      if (!overrideFamily) {
        fail(404, "FAMILY_NOT_FOUND", "Family not found");
      }
      familyContext = {
        familyId: overrideFamily.familyId,
        familyName: overrideFamily.familyName,
        familySlug: overrideFamily.familySlug,
        familyStatus: overrideFamily.familyStatus,
        membershipId: null,
        membershipRole: null,
        membershipStatus: null,
      };
    }

    if (!isAdminRole(actor.role) && familyContext.membershipRole !== "primary_adult") {
      fail(403, "FORBIDDEN_INVITE", "Only a primary adult can invite family members");
    }

    const inviteeName = normalizeInviteeName(firstNameRaw, lastNameRaw, email || "member@example.com");

    let inviteeUser:
      | {
          id: number;
          email: string;
          displayName: string;
        }
      | undefined;

    if (email) {
      [inviteeUser] = await tx
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
    }

    if (inviteeUser) {
      const [activeMembership] = await tx
        .select({
          id: familyMembers.id,
          familyId: familyMembers.familyId,
        })
        .from(familyMembers)
        .where(and(eq(familyMembers.userId, inviteeUser.id), eq(familyMembers.membershipStatus, "active")))
        .limit(1);
      if (activeMembership && activeMembership.familyId !== familyContext.familyId) {
        fail(409, "ALREADY_IN_OTHER_FAMILY", "Invitee already belongs to another active family");
      }
      if (activeMembership && activeMembership.familyId === familyContext.familyId) {
        fail(409, "ALREADY_IN_FAMILY", "Invitee is already in this family");
      }
    }

    if (email) {
      const [existingPendingByEmail] = await tx
        .select({ id: familyInvites.id })
        .from(familyInvites)
        .where(
          and(
            eq(familyInvites.familyId, familyContext.familyId),
            eq(familyInvites.inviteeEmail, email),
            eq(familyInvites.status, "pending"),
            gt(familyInvites.expiresAt, now),
          ),
        )
        .limit(1);
      if (existingPendingByEmail) {
        fail(409, "INVITE_ALREADY_PENDING", "A pending invite already exists for this email");
      }
    }

    const [thread] = await tx
      .insert(inboxThreads)
      .values({
        type: "family_invite",
        subject: `Family invite · ${familyContext.familyName}`,
        familyId: familyContext.familyId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: inboxThreads.id,
      });

    await ensureParticipant(tx, thread.id, actor.id);
    if (inviteeUser) {
      await ensureParticipant(tx, thread.id, inviteeUser.id);
    }

    const rawToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(rawToken);
    const expiresAt = invitationExpiryFromNow();

    const [invite] = await tx
      .insert(familyInvites)
      .values({
        familyId: familyContext.familyId,
        threadId: thread.id,
        inviterUserId: actor.id,
        inviteeUserId: inviteeUser?.id ?? null,
        inviteeEmail: email || null,
        inviteeFirstName: inviteeName.firstName,
        inviteeLastName: inviteeName.lastName,
        roleInFamily,
        contactRequired: !email,
        tokenHash,
        status: "pending",
        expiresAt,
        acceptedAt: null,
        revokedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: familyInvites.id,
        familyId: familyInvites.familyId,
        threadId: familyInvites.threadId,
        inviteeUserId: familyInvites.inviteeUserId,
        inviteeEmail: familyInvites.inviteeEmail,
        inviteeFirstName: familyInvites.inviteeFirstName,
        inviteeLastName: familyInvites.inviteeLastName,
        roleInFamily: familyInvites.roleInFamily,
        contactRequired: familyInvites.contactRequired,
        expiresAt: familyInvites.expiresAt,
        status: familyInvites.status,
      });

    await insertSystemMessage(tx, {
      threadId: thread.id,
      messageType: "action",
      body: `${actor.displayName} invited ${invite.inviteeFirstName || invite.inviteeEmail || "a member"} to join the family.`,
      actionPayloadJson: {
        kind: "family_invite",
        inviteId: invite.id,
        actions: [
          { type: "accept", label: "Accept" },
          { type: "decline", label: "Decline" },
        ],
      },
    });

    await tx.insert(adminAuditLog).values({
      actorUserId: actor.id,
      action: "family.invite.created",
      targetType: "family_invite",
      targetId: String(invite.id),
      payloadJson: {
        familyId: familyContext.familyId,
        inviteeEmail: invite.inviteeEmail,
        inviteeUserId: invite.inviteeUserId,
        roleInFamily: invite.roleInFamily,
        contactRequired: invite.contactRequired,
      },
      createdAt: now,
    });

    return {
      actor,
      family: familyContext,
      invite,
      rawToken,
    };
  });

  const displayInviteeName = [result.invite.inviteeFirstName, result.invite.inviteeLastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (result.invite.inviteeEmail) {
    const actionUrl = buildFamilyInviteActionUrl({
      siteOrigin: input.siteOrigin,
      inviteeUserId: result.invite.inviteeUserId,
      rawToken: result.rawToken,
    });

    await createFamilyInviteEmailNotification({
      inviteId: result.invite.id,
      threadId: result.invite.threadId,
      actor: result.actor,
      familyName: result.family.familyName,
      inviteeEmail: result.invite.inviteeEmail,
      inviteeName: displayInviteeName || "there",
      actionUrl,
    });
  }

  return {
    inviteId: result.invite.id,
    familyId: result.family.familyId,
    threadId: result.invite.threadId,
    status: result.invite.status,
    expiresAt: result.invite.expiresAt,
    contactRequired: result.invite.contactRequired,
    inviteeEmail: result.invite.inviteeEmail,
  };
}

export async function updateFamilyInviteContact(input: {
  actorUserId: number;
  inviteId: number;
  email: string;
  siteOrigin: string;
}) {
  const email = normalizeUserEmail(clean(input.email));
  if (!email) {
    fail(400, "EMAIL_REQUIRED", "Invite email is required");
  }

  const result = await getDb().transaction(async (tx) => {
    const now = new Date();
    const actor = await getActor(tx, input.actorUserId);
    const invite = await loadInviteForUpdate(tx, input.inviteId);
    if (!invite) {
      fail(404, "INVITE_NOT_FOUND", "Invite not found");
    }
    if (invite.status !== "pending") {
      fail(409, "INVITE_NOT_PENDING", "Only pending invites can be updated");
    }

    const actorFamily = await getActiveFamilyContextForUser(tx, actor.id);
    const canManageAsPrimaryAdult =
      actorFamily?.familyId === invite.familyId && actorFamily.membershipRole === "primary_adult";
    if (!isAdminRole(actor.role) && invite.inviterUserId !== actor.id && !canManageAsPrimaryAdult) {
      fail(403, "FORBIDDEN_CONTACT_UPDATE", "Only the inviter, family primary adult, or admin can update contact");
    }

    const [existingPending] = await tx
      .select({
        id: familyInvites.id,
      })
      .from(familyInvites)
      .where(
        and(
          eq(familyInvites.familyId, invite.familyId),
          eq(familyInvites.inviteeEmail, email),
          eq(familyInvites.status, "pending"),
          ne(familyInvites.id, invite.id),
        ),
      )
      .limit(1);
    if (existingPending) {
      fail(409, "INVITE_ALREADY_PENDING", "A pending invite already exists for this email");
    }

    const [inviteeUser] = await tx
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (inviteeUser) {
      const [otherMembership] = await tx
        .select({
          id: familyMembers.id,
          familyId: familyMembers.familyId,
        })
        .from(familyMembers)
        .where(and(eq(familyMembers.userId, inviteeUser.id), eq(familyMembers.membershipStatus, "active")))
        .limit(1);
      if (otherMembership && otherMembership.familyId !== invite.familyId) {
        fail(409, "ALREADY_IN_OTHER_FAMILY", "Invitee already belongs to another active family");
      }
      if (otherMembership && otherMembership.familyId === invite.familyId) {
        fail(409, "ALREADY_IN_FAMILY", "Invitee is already in this family");
      }
      await ensureParticipant(tx, invite.threadId, inviteeUser.id);
    }

    const rawToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(rawToken);
    const expiresAt = invitationExpiryFromNow();

    const [updatedInvite] = await tx
      .update(familyInvites)
      .set({
        inviteeEmail: email,
        inviteeUserId: inviteeUser?.id ?? null,
        contactRequired: false,
        tokenHash,
        expiresAt,
        updatedAt: now,
      })
      .where(eq(familyInvites.id, invite.id))
      .returning({
        id: familyInvites.id,
        familyId: familyInvites.familyId,
        threadId: familyInvites.threadId,
        inviteeEmail: familyInvites.inviteeEmail,
        inviteeUserId: familyInvites.inviteeUserId,
        inviteeFirstName: familyInvites.inviteeFirstName,
        inviteeLastName: familyInvites.inviteeLastName,
      });

    const [family] = await tx
      .select({
        name: families.name,
      })
      .from(families)
      .where(eq(families.id, invite.familyId))
      .limit(1);

    await insertSystemMessage(tx, {
      threadId: invite.threadId,
      body: `${actor.displayName} added contact details (${email}) and sent the family invite.`,
    });

    await tx.insert(adminAuditLog).values({
      actorUserId: actor.id,
      action: "family.invite.contact_updated",
      targetType: "family_invite",
      targetId: String(invite.id),
      payloadJson: {
        inviteId: invite.id,
        inviteeEmail: email,
      },
      createdAt: now,
    });

    if (!updatedInvite) {
      fail(500, "INVITE_UPDATE_FAILED", "Unable to update invite contact");
    }

    return {
      invite: updatedInvite,
      actor,
      familyName: family?.name ?? "Family",
      rawToken,
    };
  });

  if (!result.invite.inviteeEmail) {
    fail(500, "INVITE_UPDATE_FAILED", "Invite email was not saved");
  }

  const actionUrl = buildFamilyInviteActionUrl({
    siteOrigin: input.siteOrigin,
    inviteeUserId: result.invite.inviteeUserId,
    rawToken: result.rawToken,
  });

  await createFamilyInviteEmailNotification({
    inviteId: result.invite.id,
    threadId: result.invite.threadId,
    actor: result.actor,
    familyName: result.familyName,
    inviteeEmail: result.invite.inviteeEmail,
    inviteeName: [result.invite.inviteeFirstName, result.invite.inviteeLastName].filter(Boolean).join(" ").trim() || "there",
    actionUrl,
  });

  return {
    inviteId: result.invite.id,
    threadId: result.invite.threadId,
    inviteeEmail: result.invite.inviteeEmail,
    contactRequired: false,
  };
}

async function loadInviteForUpdate(tx: DrizzleTx, inviteId: number) {
  await tx.execute(sql`select id from family_invites where id = ${inviteId} for update`);

  const [invite] = await tx
    .select({
      id: familyInvites.id,
      familyId: familyInvites.familyId,
      threadId: familyInvites.threadId,
      inviterUserId: familyInvites.inviterUserId,
      inviteeUserId: familyInvites.inviteeUserId,
      inviteeEmail: familyInvites.inviteeEmail,
      inviteeFirstName: familyInvites.inviteeFirstName,
      inviteeLastName: familyInvites.inviteeLastName,
      roleInFamily: familyInvites.roleInFamily,
      status: familyInvites.status,
      expiresAt: familyInvites.expiresAt,
      acceptedAt: familyInvites.acceptedAt,
      contactRequired: familyInvites.contactRequired,
    })
    .from(familyInvites)
    .where(eq(familyInvites.id, inviteId))
    .limit(1);

  return invite;
}

function canInviteeAct(invite: { inviteeUserId: number | null; inviteeEmail: string | null }, actor: Actor) {
  if (invite.inviteeUserId && invite.inviteeUserId === actor.id) {
    return true;
  }
  if (invite.inviteeEmail) {
    return normalizeUserEmail(invite.inviteeEmail) === normalizeUserEmail(actor.email);
  }
  return false;
}

export async function acceptFamilyInvite(input: { actorUserId: number; inviteId: number }) {
  return getDb().transaction(async (tx) => {
    const now = new Date();
    const actor = await getActor(tx, input.actorUserId);
    const invite = await loadInviteForUpdate(tx, input.inviteId);

    if (!invite) {
      fail(404, "INVITE_NOT_FOUND", "Invite not found");
    }

    if (!canInviteeAct(invite, actor)) {
      fail(403, "FORBIDDEN_INVITEE", "Only the invitee can accept this invite");
    }

    if (invite.status === "accepted") {
      return {
        inviteId: invite.id,
        familyId: invite.familyId,
        threadId: invite.threadId,
        alreadyAccepted: true,
      };
    }

    if (invite.status !== "pending") {
      fail(409, "INVITE_NOT_PENDING", "Invite is no longer pending");
    }

    if (invite.expiresAt <= now) {
      await tx
        .update(familyInvites)
        .set({
          status: "expired",
          updatedAt: now,
        })
        .where(eq(familyInvites.id, invite.id));
      await insertSystemMessage(tx, {
        threadId: invite.threadId,
        body: `Invite for ${invite.inviteeFirstName || invite.inviteeEmail || "member"} has expired.`,
      });
      fail(409, "INVITE_EXPIRED", "Invite has expired");
    }

    const [otherActiveMembership] = await tx
      .select({
        id: familyMembers.id,
        familyId: familyMembers.familyId,
      })
      .from(familyMembers)
      .where(and(eq(familyMembers.userId, actor.id), eq(familyMembers.membershipStatus, "active"), ne(familyMembers.familyId, invite.familyId)))
      .limit(1);
    if (otherActiveMembership) {
      fail(409, "ALREADY_IN_OTHER_FAMILY", "You already belong to another active family");
    }

    const [existingMembership] = await tx
      .select({
        id: familyMembers.id,
      })
      .from(familyMembers)
      .where(and(eq(familyMembers.familyId, invite.familyId), eq(familyMembers.userId, actor.id)))
      .limit(1);

    if (existingMembership) {
      await tx
        .update(familyMembers)
        .set({
          membershipStatus: "active",
          roleInFamily: invite.roleInFamily,
          joinedAt: now,
          updatedAt: now,
        })
        .where(eq(familyMembers.id, existingMembership.id));
    } else {
      await tx.insert(familyMembers).values({
        familyId: invite.familyId,
        userId: actor.id,
        roleInFamily: invite.roleInFamily,
        membershipStatus: "active",
        joinedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    await tx
      .update(familyInvites)
      .set({
        inviteeUserId: actor.id,
        status: "accepted",
        acceptedAt: now,
        updatedAt: now,
      })
      .where(eq(familyInvites.id, invite.id));

    await ensureParticipant(tx, invite.threadId, actor.id);
    await tx
      .update(inboxThreads)
      .set({
        type: "family_chat",
        updatedAt: now,
      })
      .where(eq(inboxThreads.id, invite.threadId));

    await insertSystemMessage(tx, {
      threadId: invite.threadId,
      body: `${actor.displayName} accepted the family invite.`,
    });

    await tx.insert(adminAuditLog).values({
      actorUserId: actor.id,
      action: "family.invite.accepted",
      targetType: "family_invite",
      targetId: String(invite.id),
      payloadJson: {
        familyId: invite.familyId,
        inviteId: invite.id,
      },
      createdAt: now,
    });

    return {
      inviteId: invite.id,
      familyId: invite.familyId,
      threadId: invite.threadId,
      alreadyAccepted: false,
    };
  });
}

export async function declineFamilyInvite(input: { actorUserId: number; inviteId: number }) {
  return getDb().transaction(async (tx) => {
    const now = new Date();
    const actor = await getActor(tx, input.actorUserId);
    const invite = await loadInviteForUpdate(tx, input.inviteId);
    if (!invite) {
      fail(404, "INVITE_NOT_FOUND", "Invite not found");
    }
    if (!canInviteeAct(invite, actor)) {
      fail(403, "FORBIDDEN_INVITEE", "Only the invitee can decline this invite");
    }
    if (invite.status === "declined") {
      return {
        inviteId: invite.id,
        threadId: invite.threadId,
        alreadyDeclined: true,
      };
    }
    if (invite.status !== "pending") {
      fail(409, "INVITE_NOT_PENDING", "Invite is no longer pending");
    }
    if (invite.expiresAt <= now) {
      await tx
        .update(familyInvites)
        .set({
          status: "expired",
          updatedAt: now,
        })
        .where(eq(familyInvites.id, invite.id));
      fail(409, "INVITE_EXPIRED", "Invite has expired");
    }

    await tx
      .update(familyInvites)
      .set({
        status: "declined",
        updatedAt: now,
      })
      .where(eq(familyInvites.id, invite.id));

    await insertSystemMessage(tx, {
      threadId: invite.threadId,
      body: `${actor.displayName} declined the family invite.`,
    });

    await tx.insert(adminAuditLog).values({
      actorUserId: actor.id,
      action: "family.invite.declined",
      targetType: "family_invite",
      targetId: String(invite.id),
      payloadJson: {
        familyId: invite.familyId,
        inviteId: invite.id,
      },
      createdAt: now,
    });

    return {
      inviteId: invite.id,
      threadId: invite.threadId,
      alreadyDeclined: false,
    };
  });
}

export async function revokeFamilyInvite(input: { actorUserId: number; inviteId: number }) {
  return getDb().transaction(async (tx) => {
    const now = new Date();
    const actor = await getActor(tx, input.actorUserId);
    const invite = await loadInviteForUpdate(tx, input.inviteId);
    if (!invite) {
      fail(404, "INVITE_NOT_FOUND", "Invite not found");
    }

    const actorFamily = await getActiveFamilyContextForUser(tx, actor.id);
    const canManageAsPrimaryAdult =
      actorFamily?.familyId === invite.familyId && actorFamily.membershipRole === "primary_adult";

    if (!isAdminRole(actor.role) && invite.inviterUserId !== actor.id && !canManageAsPrimaryAdult) {
      fail(403, "FORBIDDEN_REVOKE", "Only the inviter, family primary adult, or admin can revoke");
    }

    if (invite.status === "revoked") {
      return {
        inviteId: invite.id,
        threadId: invite.threadId,
        alreadyRevoked: true,
      };
    }
    if (invite.status !== "pending") {
      fail(409, "INVITE_NOT_PENDING", "Invite is no longer pending");
    }

    await tx
      .update(familyInvites)
      .set({
        status: "revoked",
        revokedAt: now,
        updatedAt: now,
      })
      .where(eq(familyInvites.id, invite.id));

    await insertSystemMessage(tx, {
      threadId: invite.threadId,
      body: `${actor.displayName} revoked this family invite.`,
    });

    await tx.insert(adminAuditLog).values({
      actorUserId: actor.id,
      action: "family.invite.revoked",
      targetType: "family_invite",
      targetId: String(invite.id),
      payloadJson: {
        familyId: invite.familyId,
        inviteId: invite.id,
      },
      createdAt: now,
    });

    return {
      inviteId: invite.id,
      threadId: invite.threadId,
      alreadyRevoked: false,
    };
  });
}

export async function acceptFamilyInviteByToken(input: {
  actorUserId: number;
  token: string;
  actorEmail: string;
}) {
  const tokenHash = hashInvitationToken(input.token);
  const inviteId = await getDb().transaction(async (tx) => {
    const [invite] = await tx
      .select({
        id: familyInvites.id,
        status: familyInvites.status,
        inviteeEmail: familyInvites.inviteeEmail,
      })
      .from(familyInvites)
      .where(eq(familyInvites.tokenHash, tokenHash))
      .limit(1);
    if (!invite) {
      fail(404, "INVITE_NOT_FOUND", "Family invite token is invalid");
    }
    if (invite.inviteeEmail && normalizeUserEmail(invite.inviteeEmail) !== normalizeUserEmail(input.actorEmail)) {
      fail(403, "TOKEN_EMAIL_MISMATCH", "Invite token does not match this account email");
    }

    return invite.id;
  });

  return acceptFamilyInvite({
    actorUserId: input.actorUserId,
    inviteId,
  });
}

export async function getMyFamilyOverview(actorUserId: number) {
  const db = getDb();
  const now = new Date();

  await db
    .update(familyInvites)
    .set({
      status: "expired",
      updatedAt: now,
    })
    .where(and(eq(familyInvites.status, "pending"), lte(familyInvites.expiresAt, now)));

  const [actor] = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, actorUserId))
    .limit(1);
  if (!actor) {
    fail(404, "ACTOR_NOT_FOUND", "User not found");
  }

  const familyContext = await db
    .select({
      familyId: families.id,
      familyName: families.name,
      familySlug: families.slug,
      familyStatus: families.status,
      membershipId: familyMembers.id,
      membershipRole: familyMembers.roleInFamily,
      membershipStatus: familyMembers.membershipStatus,
    })
    .from(familyMembers)
    .innerJoin(families, eq(families.id, familyMembers.familyId))
    .where(and(eq(familyMembers.userId, actor.id), eq(familyMembers.membershipStatus, "active")))
    .limit(1);

  if (!familyContext[0]) {
    return {
      actor,
      family: null,
      members: [],
      invites: [],
      joinRequests: [],
      duesByMember: [],
      canManageInvites: false,
    };
  }

  const family = familyContext[0];
  const canManageInvites = isAdminRole(actor.role) || family.membershipRole === "primary_adult";

  const members = await db
    .select({
      id: familyMembers.id,
      familyId: familyMembers.familyId,
      userId: familyMembers.userId,
      roleInFamily: familyMembers.roleInFamily,
      membershipStatus: familyMembers.membershipStatus,
      joinedAt: familyMembers.joinedAt,
      displayName: users.displayName,
      email: users.email,
      avatarUrl: users.avatarUrl,
      appRole: users.role,
    })
    .from(familyMembers)
    .innerJoin(users, eq(users.id, familyMembers.userId))
    .where(eq(familyMembers.familyId, family.familyId))
    .orderBy(asc(familyMembers.joinedAt));

  const invites = await db
    .select({
      id: familyInvites.id,
      familyId: familyInvites.familyId,
      threadId: familyInvites.threadId,
      inviterUserId: familyInvites.inviterUserId,
      inviterDisplayName: users.displayName,
      inviteeUserId: familyInvites.inviteeUserId,
      inviteeEmail: familyInvites.inviteeEmail,
      inviteeFirstName: familyInvites.inviteeFirstName,
      inviteeLastName: familyInvites.inviteeLastName,
      roleInFamily: familyInvites.roleInFamily,
      status: familyInvites.status,
      contactRequired: familyInvites.contactRequired,
      expiresAt: familyInvites.expiresAt,
      acceptedAt: familyInvites.acceptedAt,
      createdAt: familyInvites.createdAt,
    })
    .from(familyInvites)
    .innerJoin(users, eq(users.id, familyInvites.inviterUserId))
    .where(eq(familyInvites.familyId, family.familyId))
    .orderBy(desc(familyInvites.createdAt))
    .limit(60);

  const joinRequests = await db
    .select({
      id: familyJoinRequests.id,
      familyId: familyJoinRequests.familyId,
      requestorUserId: familyJoinRequests.requestorUserId,
      requestorDisplayName: users.displayName,
      requestedRoleInFamily: familyJoinRequests.requestedRoleInFamily,
      status: familyJoinRequests.status,
      note: familyJoinRequests.note,
      createdAt: familyJoinRequests.createdAt,
      respondedAt: familyJoinRequests.respondedAt,
      respondedByUserId: familyJoinRequests.respondedByUserId,
    })
    .from(familyJoinRequests)
    .innerJoin(users, eq(users.id, familyJoinRequests.requestorUserId))
    .where(eq(familyJoinRequests.familyId, family.familyId))
    .orderBy(desc(familyJoinRequests.createdAt))
    .limit(40);

  const memberIds = members.map((member) => member.userId);
  const duesByMember =
    memberIds.length > 0
      ? await db
          .select({
            userId: duesInvoices.userId,
            openInvoiceCount: sql<number>`count(*)::int`,
            totalOpenAmountCents: sql<number>`coalesce(sum(${duesInvoices.amountCents}), 0)::int`,
          })
          .from(duesInvoices)
          .where(and(inArray(duesInvoices.userId, memberIds), inArray(duesInvoices.status, ["open", "overdue"])))
          .groupBy(duesInvoices.userId)
      : [];

  return {
    actor,
    family,
    members,
    invites,
    joinRequests,
    duesByMember,
    canManageInvites,
  };
}

export async function listInboxThreads(actorUserId: number) {
  const db = getDb();
  const participantRows = await db
    .select({
      participantId: inboxParticipants.id,
      threadId: inboxParticipants.threadId,
      lastReadAt: inboxParticipants.lastReadAt,
      muted: inboxParticipants.muted,
      threadType: inboxThreads.type,
      subject: inboxThreads.subject,
      familyId: inboxThreads.familyId,
      familyName: families.name,
      threadCreatedAt: inboxThreads.createdAt,
      threadUpdatedAt: inboxThreads.updatedAt,
    })
    .from(inboxParticipants)
    .innerJoin(inboxThreads, eq(inboxThreads.id, inboxParticipants.threadId))
    .leftJoin(families, eq(families.id, inboxThreads.familyId))
    .where(eq(inboxParticipants.userId, actorUserId))
    .orderBy(desc(inboxThreads.updatedAt), desc(inboxThreads.id));

  const threadIds = participantRows.map((row) => row.threadId);
  const latestByThread = new Map<number, { id: number; threadId: number; body: string; messageType: string; createdAt: Date }>();
  const participantCountByThread = new Map<number, number>();

  if (threadIds.length > 0) {
    const messageRows = await db
      .select({
        id: inboxMessages.id,
        threadId: inboxMessages.threadId,
        body: inboxMessages.body,
        messageType: inboxMessages.messageType,
        createdAt: inboxMessages.createdAt,
      })
      .from(inboxMessages)
      .where(inArray(inboxMessages.threadId, threadIds))
      .orderBy(desc(inboxMessages.createdAt), desc(inboxMessages.id))
      .limit(1000);
    for (const message of messageRows) {
      if (!latestByThread.has(message.threadId)) {
        latestByThread.set(message.threadId, message);
      }
    }

    const participantCounts = await db
      .select({
        threadId: inboxParticipants.threadId,
        count: sql<number>`count(*)::int`,
      })
      .from(inboxParticipants)
      .where(inArray(inboxParticipants.threadId, threadIds))
      .groupBy(inboxParticipants.threadId);
    for (const row of participantCounts) {
      participantCountByThread.set(row.threadId, row.count);
    }
  }

  return participantRows.map((row) => {
    const latest = latestByThread.get(row.threadId);
    const unread = Boolean(latest && (!row.lastReadAt || latest.createdAt > row.lastReadAt));
    return {
      threadId: row.threadId,
      threadType: row.threadType,
      subject: row.subject,
      familyId: row.familyId,
      familyName: row.familyName ?? "",
      muted: row.muted,
      unread,
      participantCount: participantCountByThread.get(row.threadId) ?? 1,
      lastReadAt: row.lastReadAt,
      latestMessage: latest
        ? {
            id: latest.id,
            body: latest.body,
            messageType: latest.messageType,
            createdAt: latest.createdAt,
          }
        : null,
      updatedAt: row.threadUpdatedAt,
      createdAt: row.threadCreatedAt,
    };
  });
}

export async function getInboxThreadMessages(input: { actorUserId: number; threadId: number }) {
  const db = getDb();
  const now = new Date();

  const [participant] = await db
    .select({
      id: inboxParticipants.id,
      threadId: inboxParticipants.threadId,
      userId: inboxParticipants.userId,
    })
    .from(inboxParticipants)
    .where(and(eq(inboxParticipants.threadId, input.threadId), eq(inboxParticipants.userId, input.actorUserId)))
    .limit(1);
  if (!participant) {
    fail(403, "FORBIDDEN_THREAD", "You do not have access to this thread");
  }

  const [thread] = await db
    .select({
      id: inboxThreads.id,
      type: inboxThreads.type,
      subject: inboxThreads.subject,
      familyId: inboxThreads.familyId,
      familyName: families.name,
      createdAt: inboxThreads.createdAt,
      updatedAt: inboxThreads.updatedAt,
    })
    .from(inboxThreads)
    .leftJoin(families, eq(families.id, inboxThreads.familyId))
    .where(eq(inboxThreads.id, input.threadId))
    .limit(1);
  if (!thread) {
    fail(404, "THREAD_NOT_FOUND", "Thread not found");
  }

  const messages = await db
    .select({
      id: inboxMessages.id,
      threadId: inboxMessages.threadId,
      senderUserId: inboxMessages.senderUserId,
      senderDisplayName: users.displayName,
      messageType: inboxMessages.messageType,
      body: inboxMessages.body,
      actionPayloadJson: inboxMessages.actionPayloadJson,
      createdAt: inboxMessages.createdAt,
    })
    .from(inboxMessages)
    .leftJoin(users, eq(users.id, inboxMessages.senderUserId))
    .where(eq(inboxMessages.threadId, input.threadId))
    .orderBy(asc(inboxMessages.createdAt), asc(inboxMessages.id))
    .limit(1000);

  await db
    .update(inboxParticipants)
    .set({
      lastReadAt: now,
      updatedAt: now,
    })
    .where(eq(inboxParticipants.id, participant.id));

  return {
    thread,
    messages,
  };
}

export async function createInboxMessage(input: { actorUserId: number; threadId: number; body: string }) {
  const text = clean(input.body);
  if (!text) {
    fail(400, "MESSAGE_REQUIRED", "Message cannot be empty");
  }
  if (text.length > 4000) {
    fail(400, "MESSAGE_TOO_LONG", "Message exceeds 4000 characters");
  }

  return getDb().transaction(async (tx) => {
    const now = new Date();
    const [participant] = await tx
      .select({
        id: inboxParticipants.id,
      })
      .from(inboxParticipants)
      .where(and(eq(inboxParticipants.threadId, input.threadId), eq(inboxParticipants.userId, input.actorUserId)))
      .limit(1);
    if (!participant) {
      fail(403, "FORBIDDEN_THREAD", "You do not have access to this thread");
    }

    const [created] = await tx
      .insert(inboxMessages)
      .values({
        threadId: input.threadId,
        senderUserId: input.actorUserId,
        messageType: "text",
        body: text,
        actionPayloadJson: {},
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: inboxMessages.id,
        threadId: inboxMessages.threadId,
        senderUserId: inboxMessages.senderUserId,
        messageType: inboxMessages.messageType,
        body: inboxMessages.body,
        actionPayloadJson: inboxMessages.actionPayloadJson,
        createdAt: inboxMessages.createdAt,
      });

    await tx
      .update(inboxThreads)
      .set({
        updatedAt: now,
      })
      .where(eq(inboxThreads.id, input.threadId));

    return created;
  });
}
