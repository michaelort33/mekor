import { and, desc, eq, ilike, or } from "drizzle-orm";

import type { AdminActor } from "@/lib/admin/actor";
import { getDb } from "@/db/client";
import {
  communicationPreferences,
  contactMethods,
  membershipApplications,
  membershipPipelineEvents,
  people,
  userInvitations,
  users,
} from "@/db/schema";
import {
  buildApplicantDisplayName,
  calculateMembershipEstimate,
  getMembershipCategoryLabel,
  type MembershipApplicationRecordInput,
  type MembershipApplicationStatus,
} from "@/lib/membership/applications";
import { sendMembershipApprovalEmail } from "@/lib/membership/applications-email";
import { generateInvitationToken, hashInvitationToken, invitationExpiryFromNow } from "@/lib/invitations/token";
import { normalizeUserEmail } from "@/lib/users/validation";

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function createMembershipApplication(input: MembershipApplicationRecordInput) {
  const estimate = calculateMembershipEstimate({
    membershipCategory: input.membershipCategory,
    includeSecurityDonation: input.includeSecurityDonation,
  });
  const now = new Date();
  const email = normalizeUserEmail(input.email);
  const displayName = buildApplicantDisplayName(input);

  const [created] = await getDb()
    .insert(membershipApplications)
    .values({
      status: "pending",
      applicationType: input.applicationType,
      membershipCategory: input.membershipCategory,
      preferredPaymentMethod: input.preferredPaymentMethod,
      includeSecurityDonation: input.includeSecurityDonation,
      coverOnlineFees: input.coverOnlineFees,
      totalAmountCents: estimate.totalAmountCents,
      firstName: input.firstName,
      lastName: input.lastName,
      displayName,
      hebrewName: input.hebrewName,
      email,
      phone: input.phone,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
      spouseFirstName: input.spouseFirstName,
      spouseLastName: input.spouseLastName,
      spouseHebrewName: input.spouseHebrewName,
      spouseEmail: input.spouseEmail,
      spousePhone: input.spousePhone,
      householdMembersJson: input.householdMembers,
      yahrzeitsJson: input.yahrzeits,
      volunteerInterestsJson: input.volunteerInterests,
      notes: input.notes,
      sourcePath: input.sourcePath,
      payloadJson: input,
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: membershipApplications.id,
      createdAt: membershipApplications.createdAt,
    });

  return {
    applicationId: created.id,
    createdAt: created.createdAt,
  };
}

export async function listMembershipApplications(input: {
  q?: string;
  status?: MembershipApplicationStatus | "";
}) {
  const q = input.q?.trim() ?? "";
  const status = input.status?.trim() ?? "";

  return getDb()
    .select({
      id: membershipApplications.id,
      status: membershipApplications.status,
      applicationType: membershipApplications.applicationType,
      membershipCategory: membershipApplications.membershipCategory,
      preferredPaymentMethod: membershipApplications.preferredPaymentMethod,
      includeSecurityDonation: membershipApplications.includeSecurityDonation,
      coverOnlineFees: membershipApplications.coverOnlineFees,
      totalAmountCents: membershipApplications.totalAmountCents,
      firstName: membershipApplications.firstName,
      lastName: membershipApplications.lastName,
      displayName: membershipApplications.displayName,
      hebrewName: membershipApplications.hebrewName,
      email: membershipApplications.email,
      phone: membershipApplications.phone,
      addressLine1: membershipApplications.addressLine1,
      addressLine2: membershipApplications.addressLine2,
      city: membershipApplications.city,
      state: membershipApplications.state,
      postalCode: membershipApplications.postalCode,
      spouseFirstName: membershipApplications.spouseFirstName,
      spouseLastName: membershipApplications.spouseLastName,
      spouseHebrewName: membershipApplications.spouseHebrewName,
      spouseEmail: membershipApplications.spouseEmail,
      spousePhone: membershipApplications.spousePhone,
      householdMembersJson: membershipApplications.householdMembersJson,
      yahrzeitsJson: membershipApplications.yahrzeitsJson,
      volunteerInterestsJson: membershipApplications.volunteerInterestsJson,
      notes: membershipApplications.notes,
      reviewNotes: membershipApplications.reviewNotes,
      reviewedAt: membershipApplications.reviewedAt,
      reviewedByUserId: membershipApplications.reviewedByUserId,
      approvedPersonId: membershipApplications.approvedPersonId,
      invitationId: membershipApplications.invitationId,
      createdAt: membershipApplications.createdAt,
      updatedAt: membershipApplications.updatedAt,
    })
    .from(membershipApplications)
    .where(
      and(
        status ? eq(membershipApplications.status, status as MembershipApplicationStatus) : undefined,
        q
          ? or(
              ilike(membershipApplications.displayName, `%${q}%`),
              ilike(membershipApplications.email, `%${q}%`),
              ilike(membershipApplications.phone, `%${q}%`),
            )
          : undefined,
      ),
    )
    .orderBy(desc(membershipApplications.createdAt), desc(membershipApplications.id));
}

async function upsertCommunicationDefaults(personId: number, now: Date) {
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
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();
}

async function upsertContactRecords(input: { personId: number; email: string; phone: string; now: Date }) {
  await getDb()
    .insert(contactMethods)
    .values({
      personId: input.personId,
      type: "email",
      value: input.email,
      isPrimary: true,
      verifiedAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .onConflictDoUpdate({
      target: [contactMethods.personId, contactMethods.type, contactMethods.value],
      set: {
        isPrimary: true,
        updatedAt: input.now,
      },
    });

  if (input.phone) {
    await getDb()
      .insert(contactMethods)
      .values({
        personId: input.personId,
        type: "phone",
        value: input.phone,
        isPrimary: true,
        verifiedAt: null,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .onConflictDoUpdate({
        target: [contactMethods.personId, contactMethods.type, contactMethods.value],
        set: {
          isPrimary: true,
          updatedAt: input.now,
        },
      });
  }
}

export async function approveMembershipApplication(input: {
  applicationId: number;
  actor: AdminActor;
  reviewNotes: string;
  siteOrigin: string;
}) {
  const db = getDb();
  const now = new Date();
  const [application] = await db
    .select()
    .from(membershipApplications)
    .where(eq(membershipApplications.id, input.applicationId))
    .limit(1);

  if (!application) {
    throw new Error("Application not found");
  }
  if (application.status !== "pending") {
    throw new Error("Only pending applications can be approved");
  }

  const normalizedEmail = normalizeUserEmail(application.email);
  const displayName = buildApplicantDisplayName(application);

  const [existingPerson] = await db
    .select({
      id: people.id,
      userId: people.userId,
      status: people.status,
      joinedAt: people.joinedAt,
    })
    .from(people)
    .where(eq(people.email, normalizedEmail))
    .limit(1);

  const [existingUser] = await db
    .select({
      id: users.id,
      role: users.role,
    })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  const [person] = existingPerson
    ? await db
        .update(people)
        .set({
          userId: existingUser?.id ?? existingPerson.userId,
          status: "member",
          firstName: application.firstName,
          lastName: application.lastName,
          displayName,
          email: normalizedEmail,
          phone: application.phone,
          city: application.city,
          notes: application.notes,
          source: "membership_application",
          joinedAt: existingPerson.joinedAt ?? now,
          updatedAt: now,
        })
        .where(eq(people.id, existingPerson.id))
        .returning({ id: people.id })
    : await db
        .insert(people)
        .values({
          userId: existingUser?.id ?? null,
          status: "member",
          firstName: application.firstName,
          lastName: application.lastName,
          displayName,
          email: normalizedEmail,
          phone: application.phone,
          city: application.city,
          notes: application.notes,
          source: "membership_application",
          tags: [],
          invitedAt: null,
          joinedAt: now,
          lastContactedAt: null,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: people.id });

  await upsertCommunicationDefaults(person.id, now);
  await upsertContactRecords({ personId: person.id, email: normalizedEmail, phone: application.phone, now });

  if (existingUser) {
    await db
      .update(users)
      .set({
        role: "member",
        displayName,
        city: application.city,
        membershipStartDate: toDateOnly(now),
        updatedAt: now,
      })
      .where(eq(users.id, existingUser.id));
  }

  let invitationId: number | null = null;
  let acceptUrl: string | undefined;
  if (!existingUser) {
    const token = generateInvitationToken();
    const tokenHash = hashInvitationToken(token);
    const expiresAt = invitationExpiryFromNow();
    const [createdInvitation] = await db
      .insert(userInvitations)
      .values({
        email: normalizedEmail,
        role: "member",
        personId: person.id,
        invitedByUserId: input.actor.id,
        tokenHash,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: userInvitations.id });

    invitationId = createdInvitation.id;
    acceptUrl = `${input.siteOrigin}/invite/accept?token=${encodeURIComponent(token)}`;
  }

  await db.insert(membershipPipelineEvents).values({
    personId: person.id,
    actorUserId: input.actor.id,
    eventType: existingPerson?.status === "member" ? "note" : "status_changed",
    summary:
      existingPerson?.status === "member"
        ? "Membership application approved"
        : `Status changed from ${existingPerson?.status ?? "lead"} to member`,
    payloadJson: {
      applicationId: application.id,
      membershipCategory: application.membershipCategory,
      applicationType: application.applicationType,
      invitationId,
      reviewNotes: input.reviewNotes,
    },
    occurredAt: now,
    createdAt: now,
  });

  await db
    .update(membershipApplications)
    .set({
      status: "approved",
      reviewNotes: input.reviewNotes,
      reviewedAt: now,
      reviewedByUserId: input.actor.id,
      approvedPersonId: person.id,
      invitationId,
      updatedAt: now,
    })
    .where(eq(membershipApplications.id, application.id));

  try {
    await sendMembershipApprovalEmail({
      toEmail: normalizedEmail,
      firstName: application.firstName,
      membershipLabel: getMembershipCategoryLabel(application.membershipCategory as "single" | "couple_family" | "student"),
      loginUrl: `${input.siteOrigin}/login`,
      acceptUrl,
    });
  } catch (error) {
    if (invitationId) {
      await db
        .update(userInvitations)
        .set({
          revokedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userInvitations.id, invitationId));
    }
    throw error;
  }

  return {
    applicationId: application.id,
    personId: person.id,
    invitationId,
  };
}

export async function declineMembershipApplication(input: {
  applicationId: number;
  actor: AdminActor;
  reviewNotes: string;
}) {
  const now = new Date();
  const [application] = await getDb()
    .select({
      id: membershipApplications.id,
      status: membershipApplications.status,
    })
    .from(membershipApplications)
    .where(eq(membershipApplications.id, input.applicationId))
    .limit(1);

  if (!application) {
    throw new Error("Application not found");
  }
  if (application.status !== "pending") {
    throw new Error("Only pending applications can be declined");
  }

  await getDb()
    .update(membershipApplications)
    .set({
      status: "declined",
      reviewNotes: input.reviewNotes,
      reviewedAt: now,
      reviewedByUserId: input.actor.id,
      updatedAt: now,
    })
    .where(eq(membershipApplications.id, application.id));

  return { applicationId: application.id };
}
