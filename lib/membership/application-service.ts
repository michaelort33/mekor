import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";

import type { AdminActor } from "@/lib/admin/actor";
import { getDb } from "@/db/client";
import {
  communicationPreferences,
  contactMethods,
  duesInvoices,
  duesSchedules,
  membershipApplications,
  membershipPipelineEvents,
  people,
  userInvitations,
  users,
} from "@/db/schema";
import {
  buildApplicantDisplayName,
  type MembershipApprovalPlan,
  calculateMembershipEstimate,
  getMembershipCategoryLabel,
  membershipApprovalPlanSchema,
  type MembershipApplicationRecordInput,
  type MembershipApplicationStatus,
} from "@/lib/membership/applications";
import { sendMembershipApprovalEmail } from "@/lib/membership/applications-email";
import { generateInvitationToken, hashInvitationToken, invitationExpiryFromNow } from "@/lib/invitations/token";
import { ensurePersonByEmail } from "@/lib/people/service";
import { normalizeUserEmail } from "@/lib/users/validation";

function asRecord(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function readStoredApprovalPlan(payloadJson: Record<string, unknown>) {
  const parsed = membershipApprovalPlanSchema.safeParse(asRecord(payloadJson.approvalPlan));
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}

function applicationSourceLabel(applicationId: number) {
  return `membership_application:${applicationId}`;
}

async function createMembershipInvitation(input: {
  email: string;
  personId: number;
  actorUserId: number;
  siteOrigin: string;
  now: Date;
}) {
  const token = generateInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = invitationExpiryFromNow();
  const [createdInvitation] = await getDb()
    .insert(userInvitations)
    .values({
      email: input.email,
      role: "member",
      personId: input.personId,
      invitedByUserId: input.actorUserId,
      tokenHash,
      expiresAt,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .returning({ id: userInvitations.id });

  return {
    invitationId: createdInvitation.id,
    acceptUrl: `${input.siteOrigin}/invite/accept?token=${encodeURIComponent(token)}`,
  };
}

async function provisionApprovedMembershipForUser(input: {
  applicationId: number;
  userId: number;
  city: string;
  approvalPlan: MembershipApprovalPlan;
  now: Date;
}) {
  const db = getDb();
  await db
    .update(users)
    .set({
      role: "member",
      city: input.city,
      membershipStartDate: input.approvalPlan.membershipStartDate,
      membershipRenewalDate: input.approvalPlan.membershipRenewalDate,
      updatedAt: input.now,
    })
    .where(eq(users.id, input.userId));

  let duesScheduleId: number | null = null;
  let duesInvoiceId: number | null = null;

  if (input.approvalPlan.billingMode === "schedule") {
    const scheduleMarker = applicationSourceLabel(input.applicationId);
    const [existingSchedule] = await db
      .select({ id: duesSchedules.id })
      .from(duesSchedules)
      .where(and(eq(duesSchedules.userId, input.userId), eq(duesSchedules.notes, scheduleMarker)))
      .limit(1);

    if (existingSchedule) {
      duesScheduleId = existingSchedule.id;
    } else {
      const [createdSchedule] = await db
        .insert(duesSchedules)
        .values({
          userId: input.userId,
          frequency: input.approvalPlan.scheduleFrequency,
          amountCents: input.approvalPlan.scheduleAmountCents,
          currency: "usd",
          nextDueDate: input.approvalPlan.scheduleNextDueDate,
          active: true,
          notes: scheduleMarker,
          createdAt: input.now,
          updatedAt: input.now,
        })
        .returning({ id: duesSchedules.id });
      duesScheduleId = createdSchedule.id;
    }
  }

  if (input.approvalPlan.billingMode === "invoice") {
    const [existingInvoice] = await db
      .select({ id: duesInvoices.id })
      .from(duesInvoices)
      .where(
        and(
          eq(duesInvoices.userId, input.userId),
          eq(duesInvoices.label, input.approvalPlan.invoiceLabel),
          eq(duesInvoices.amountCents, input.approvalPlan.invoiceAmountCents),
          eq(duesInvoices.dueDate, input.approvalPlan.invoiceDueDate),
          inArray(duesInvoices.status, ["open", "overdue", "paid"]),
        ),
      )
      .limit(1);

    if (existingInvoice) {
      duesInvoiceId = existingInvoice.id;
    } else {
      const [createdInvoice] = await db
        .insert(duesInvoices)
        .values({
          userId: input.userId,
          label: input.approvalPlan.invoiceLabel,
          amountCents: input.approvalPlan.invoiceAmountCents,
          currency: "usd",
          dueDate: input.approvalPlan.invoiceDueDate,
          status: "open",
          createdAt: input.now,
          updatedAt: input.now,
        })
        .returning({ id: duesInvoices.id });
      duesInvoiceId = createdInvoice.id;
    }
  }

  return {
    userId: input.userId,
    membershipStartDate: input.approvalPlan.membershipStartDate,
    membershipRenewalDate: input.approvalPlan.membershipRenewalDate,
    billingMode: input.approvalPlan.billingMode,
    duesScheduleId,
    duesInvoiceId,
    appliedAt: input.now.toISOString(),
  };
}

async function maybeCreateSpouseLead(input: {
  application: typeof membershipApplications.$inferSelect;
  actor: AdminActor;
  now: Date;
  createSpouseLead: boolean;
}) {
  if (!input.createSpouseLead) {
    return null;
  }

  const spouseEmail = normalizeUserEmail(input.application.spouseEmail);
  if (!spouseEmail) {
    return null;
  }

  const spouseDisplayName = [input.application.spouseFirstName, input.application.spouseLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const spouse = await ensurePersonByEmail({
    email: spouseEmail,
    status: "lead",
    displayName: spouseDisplayName || spouseEmail,
    firstName: input.application.spouseFirstName,
    lastName: input.application.spouseLastName,
    city: input.application.city,
    source: "membership_application_spouse",
    actorUserId: input.actor.id,
  });

  await upsertContactRecords({
    personId: spouse.personId,
    email: spouseEmail,
    phone: input.application.spousePhone,
    now: input.now,
  });

  return {
    personId: spouse.personId,
    email: spouseEmail,
    displayName: spouseDisplayName || spouseEmail,
    createdAt: input.now.toISOString(),
  };
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
  approvalPlan: MembershipApprovalPlan;
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
  const currentPayloadJson = asRecord(application.payloadJson);
  const approvalPlan = input.approvalPlan;

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
        membershipStartDate: approvalPlan.membershipStartDate,
        membershipRenewalDate: approvalPlan.membershipRenewalDate,
        updatedAt: now,
      })
      .where(eq(users.id, existingUser.id));
  }

  let invitationId: number | null = null;
  let acceptUrl: string | undefined;
  if (!existingUser) {
    const invitation = await createMembershipInvitation({
      email: normalizedEmail,
      personId: person.id,
      actorUserId: input.actor.id,
      siteOrigin: input.siteOrigin,
      now,
    });
    invitationId = invitation.invitationId;
    acceptUrl = invitation.acceptUrl;
  }

  const approvalProvisioning = existingUser
    ? await provisionApprovedMembershipForUser({
        applicationId: application.id,
        userId: existingUser.id,
        city: application.city,
        approvalPlan,
        now,
      })
    : null;
  const spouseLead = await maybeCreateSpouseLead({
    application,
    actor: input.actor,
    now,
    createSpouseLead: approvalPlan.createSpouseLead,
  });

  const nextPayloadJson = {
    ...currentPayloadJson,
    approvalPlan,
    approvalProvisioning,
    spouseLead,
  };

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
      approvalPlan,
      approvalProvisioning,
      spouseLead,
      householdSummary: {
        householdMembersCount: application.householdMembersJson.length,
        yahrzeitsCount: application.yahrzeitsJson.length,
        volunteerInterestsCount: application.volunteerInterestsJson.length,
      },
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
      payloadJson: nextPayloadJson,
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
    spouseLeadPersonId: spouseLead?.personId ?? null,
    duesScheduleId: approvalProvisioning?.duesScheduleId ?? null,
    duesInvoiceId: approvalProvisioning?.duesInvoiceId ?? null,
    membershipStartDate: approvalPlan.membershipStartDate,
    membershipRenewalDate: approvalPlan.membershipRenewalDate,
    billingMode: approvalPlan.billingMode,
    provisioningStatus: approvalProvisioning ? "applied" : "pending_invite_acceptance",
  };
}

export async function finalizeApprovedMembershipOnboarding(input: {
  invitationId: number;
  userId: number;
}) {
  const db = getDb();
  const [application] = await db
    .select({
      id: membershipApplications.id,
      city: membershipApplications.city,
      payloadJson: membershipApplications.payloadJson,
    })
    .from(membershipApplications)
    .where(and(eq(membershipApplications.invitationId, input.invitationId), eq(membershipApplications.status, "approved")))
    .orderBy(desc(membershipApplications.reviewedAt), desc(membershipApplications.id))
    .limit(1);

  if (!application) {
    return null;
  }

  const currentPayloadJson = asRecord(application.payloadJson);
  const approvalPlan = readStoredApprovalPlan(currentPayloadJson);
  if (!approvalPlan) {
    return null;
  }

  const existingProvisioning = asRecord(currentPayloadJson.approvalProvisioning);
  if (existingProvisioning.userId === input.userId) {
    return {
      userId: input.userId,
      duesScheduleId:
        typeof existingProvisioning.duesScheduleId === "number" ? existingProvisioning.duesScheduleId : null,
      duesInvoiceId:
        typeof existingProvisioning.duesInvoiceId === "number" ? existingProvisioning.duesInvoiceId : null,
      membershipStartDate:
        typeof existingProvisioning.membershipStartDate === "string"
          ? existingProvisioning.membershipStartDate
          : approvalPlan.membershipStartDate,
      membershipRenewalDate:
        typeof existingProvisioning.membershipRenewalDate === "string"
          ? existingProvisioning.membershipRenewalDate
          : approvalPlan.membershipRenewalDate,
      billingMode:
        typeof existingProvisioning.billingMode === "string"
          ? existingProvisioning.billingMode
          : approvalPlan.billingMode,
      appliedAt:
        typeof existingProvisioning.appliedAt === "string"
          ? existingProvisioning.appliedAt
          : null,
    };
  }

  const now = new Date();
  const approvalProvisioning = await provisionApprovedMembershipForUser({
    applicationId: application.id,
    userId: input.userId,
    city: application.city,
    approvalPlan,
    now,
  });

  await db
    .update(membershipApplications)
    .set({
      payloadJson: {
        ...currentPayloadJson,
        approvalPlan,
        approvalProvisioning,
      },
      updatedAt: now,
    })
    .where(eq(membershipApplications.id, application.id));

  return approvalProvisioning;
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
