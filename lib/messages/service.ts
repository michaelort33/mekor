import { and, asc, eq, inArray, or, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  communicationPreferences,
  duesInvoices,
  messageCampaigns,
  messageDeliveries,
  messageSuppressions,
  people,
  users,
} from "@/db/schema";
import { MESSAGE_SEGMENTS, type MessageSegmentKey } from "@/lib/messages/segments";
import { sendSendGridEmail } from "@/lib/notifications/sendgrid";

type UserRole = "visitor" | "member" | "admin" | "super_admin";

type ResolvedRecipient = {
  personId: number;
  userId: number | null;
  status: "lead" | "invited" | "visitor" | "guest" | "member" | "admin" | "super_admin" | "inactive";
  displayName: string;
  email: string;
  phone: string;
  emailOptIn: boolean | null;
  smsOptIn: boolean | null;
  whatsappOptIn: boolean | null;
  doNotContact: boolean | null;
};

export type MessageSendInput = {
  actorUserId: number;
  actorRole: UserRole;
  channel: "email" | "sms" | "whatsapp";
  source: "manual" | "newsletter" | "automated";
  name: string;
  subject: string;
  body: string;
  segmentKey?: MessageSegmentKey;
  personIds?: number[];
  previewOnly?: boolean;
};

function clean(value: string) {
  return value.trim();
}

function uniquePositiveNumbers(values: number[]) {
  return [...new Set(values.filter((value) => Number.isInteger(value) && value > 0))];
}

function ensureSegmentAllowed(segment: MessageSegmentKey | undefined) {
  if (!segment) return;
  if (!MESSAGE_SEGMENTS.includes(segment)) {
    throw new Error("Unsupported segment");
  }
}

function enforceSendPermission(input: { actorRole: UserRole; segmentKey?: MessageSegmentKey }) {
  if (input.actorRole !== "admin" && input.actorRole !== "super_admin") {
    throw new Error("Only admin accounts can send campaigns");
  }
  if (input.actorRole === "super_admin") return;
  if (input.segmentKey === "all_people") {
    throw new Error("Only super admins can send to all people");
  }
}

function personalize(template: string, input: { displayName: string; email: string }) {
  return template
    .replaceAll("{{display_name}}", input.displayName)
    .replaceAll("{{email}}", input.email);
}

async function resolveRecipientsByPersonIds(personIds: number[]) {
  if (personIds.length === 0) return [];
  return getDb()
    .select({
      personId: people.id,
      userId: people.userId,
      status: people.status,
      displayName: people.displayName,
      email: people.email,
      phone: people.phone,
      emailOptIn: communicationPreferences.emailOptIn,
      smsOptIn: communicationPreferences.smsOptIn,
      whatsappOptIn: communicationPreferences.whatsappOptIn,
      doNotContact: communicationPreferences.doNotContact,
    })
    .from(people)
    .leftJoin(communicationPreferences, eq(communicationPreferences.personId, people.id))
    .where(inArray(people.id, personIds))
    .orderBy(asc(people.displayName), asc(people.id));
}

async function resolveRecipientsBySegment(segment: MessageSegmentKey) {
  const baseWhere =
    segment === "prospects"
      ? eq(people.status, "lead")
      : segment === "invited_not_accepted"
        ? eq(people.status, "invited")
        : segment === "active_members"
          ? inArray(people.status, ["member", "admin", "super_admin"])
          : segment === "members_overdue"
            ? inArray(people.status, ["member", "admin", "super_admin"])
            : undefined;

  if (segment !== "members_overdue") {
    return getDb()
      .select({
        personId: people.id,
        userId: people.userId,
        status: people.status,
        displayName: people.displayName,
        email: people.email,
        phone: people.phone,
        emailOptIn: communicationPreferences.emailOptIn,
        smsOptIn: communicationPreferences.smsOptIn,
        whatsappOptIn: communicationPreferences.whatsappOptIn,
        doNotContact: communicationPreferences.doNotContact,
      })
      .from(people)
      .leftJoin(communicationPreferences, eq(communicationPreferences.personId, people.id))
      .where(baseWhere)
      .orderBy(asc(people.displayName), asc(people.id));
  }

  return getDb()
    .select({
      personId: people.id,
      userId: people.userId,
      status: people.status,
      displayName: people.displayName,
      email: people.email,
      phone: people.phone,
      emailOptIn: communicationPreferences.emailOptIn,
      smsOptIn: communicationPreferences.smsOptIn,
      whatsappOptIn: communicationPreferences.whatsappOptIn,
      doNotContact: communicationPreferences.doNotContact,
    })
    .from(people)
    .innerJoin(users, eq(users.id, people.userId))
    .innerJoin(
      duesInvoices,
      and(
        eq(duesInvoices.userId, users.id),
        inArray(duesInvoices.status, ["open", "overdue"]),
      ),
    )
    .leftJoin(communicationPreferences, eq(communicationPreferences.personId, people.id))
    .where(baseWhere)
    .groupBy(
      people.id,
      people.userId,
      people.status,
      people.displayName,
      people.email,
      people.phone,
      communicationPreferences.emailOptIn,
      communicationPreferences.smsOptIn,
      communicationPreferences.whatsappOptIn,
      communicationPreferences.doNotContact,
    )
    .having(sql`COUNT(${duesInvoices.id}) > 0`)
    .orderBy(asc(people.displayName), asc(people.id));
}

async function resolveRecipients(input: { segmentKey?: MessageSegmentKey; personIds?: number[] }) {
  const ids = uniquePositiveNumbers(input.personIds ?? []);
  if (ids.length > 0) {
    return resolveRecipientsByPersonIds(ids);
  }
  const segment = input.segmentKey ?? "active_members";
  return resolveRecipientsBySegment(segment);
}

async function isSuppressed(input: { personId: number; channel: "email" | "sms" | "whatsapp"; email: string; phone: string }) {
  const [suppressed] = await getDb()
    .select({
      id: messageSuppressions.id,
    })
    .from(messageSuppressions)
    .where(
      and(
        eq(messageSuppressions.channel, input.channel),
        or(
          input.email ? eq(messageSuppressions.email, input.email) : undefined,
          input.phone ? eq(messageSuppressions.phone, input.phone) : undefined,
          eq(messageSuppressions.personId, input.personId),
        ),
      ),
    )
    .limit(1);
  return Boolean(suppressed);
}

function canContactByPreference(input: {
  channel: "email" | "sms" | "whatsapp";
  recipient: ResolvedRecipient;
}) {
  if (input.recipient.doNotContact) return false;
  if (input.channel === "email") return input.recipient.emailOptIn !== false;
  if (input.channel === "sms") return input.recipient.smsOptIn === true;
  return input.recipient.whatsappOptIn === true;
}

export async function sendMessageCampaign(input: MessageSendInput) {
  ensureSegmentAllowed(input.segmentKey);
  enforceSendPermission({
    actorRole: input.actorRole,
    segmentKey: input.segmentKey,
  });

  if (input.channel !== "email") {
    throw new Error("Only email channel is enabled right now");
  }

  const subject = clean(input.subject);
  const body = input.body.trim();
  if (!subject) throw new Error("Subject is required");
  if (!body) throw new Error("Message body is required");

  const recipients = await resolveRecipients({
    segmentKey: input.segmentKey,
    personIds: input.personIds,
  });
  if (recipients.length === 0) {
    throw new Error("No recipients found");
  }

  if (input.previewOnly) {
    return {
      mode: "preview" as const,
      recipientCount: recipients.length,
      sample: recipients.slice(0, 20).map((row) => ({
        personId: row.personId,
        displayName: row.displayName,
        email: row.email,
        status: row.status,
      })),
    };
  }

  const now = new Date();
  const [campaign] = await getDb()
    .insert(messageCampaigns)
    .values({
      createdByUserId: input.actorUserId,
      source: input.source,
      channel: input.channel,
      name: clean(input.name) || "Manual outreach",
      subject,
      body,
      segmentKey: input.segmentKey ?? "",
      recipientCount: recipients.length,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      status: "sending",
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: messageCampaigns.id });

  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const recipient of recipients) {
    const targetEmail = clean(recipient.email);
    const targetPhone = clean(recipient.phone);
    const allowedByPreference = canContactByPreference({ channel: input.channel, recipient });
    const suppressed = await isSuppressed({
      personId: recipient.personId,
      channel: input.channel,
      email: targetEmail,
      phone: targetPhone,
    });

    if (!targetEmail || !allowedByPreference || suppressed) {
      await getDb().insert(messageDeliveries).values({
        campaignId: campaign.id,
        personId: recipient.personId,
        userId: recipient.userId,
        recipientEmail: targetEmail,
        recipientPhone: targetPhone,
        recipientName: recipient.displayName,
        channel: input.channel,
        provider: "sendgrid",
        providerMessageId: "",
        status: "skipped",
        errorMessage: !targetEmail ? "Missing email" : suppressed ? "Suppressed recipient" : "Contact preference opt-out",
        payloadJson: {
          status: recipient.status,
          segmentKey: input.segmentKey ?? "",
        },
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      skippedCount += 1;
      continue;
    }

    const personalizedSubject = personalize(subject, {
      displayName: recipient.displayName,
      email: targetEmail,
    });
    const personalizedBody = personalize(body, {
      displayName: recipient.displayName,
      email: targetEmail,
    });

    try {
      const sent = await sendSendGridEmail({
        to: targetEmail,
        subject: personalizedSubject,
        text: personalizedBody,
        html: personalizedBody.includes("<") ? personalizedBody : undefined,
      });
      await getDb().insert(messageDeliveries).values({
        campaignId: campaign.id,
        personId: recipient.personId,
        userId: recipient.userId,
        recipientEmail: targetEmail,
        recipientPhone: targetPhone,
        recipientName: recipient.displayName,
        channel: input.channel,
        provider: "sendgrid",
        providerMessageId: sent.providerMessageId,
        status: "sent",
        errorMessage: "",
        payloadJson: { status: recipient.status, segmentKey: input.segmentKey ?? "" },
        sentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await getDb()
        .update(people)
        .set({
          lastContactedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(people.id, recipient.personId));
      successCount += 1;
    } catch (error) {
      await getDb().insert(messageDeliveries).values({
        campaignId: campaign.id,
        personId: recipient.personId,
        userId: recipient.userId,
        recipientEmail: targetEmail,
        recipientPhone: targetPhone,
        recipientName: recipient.displayName,
        channel: input.channel,
        provider: "sendgrid",
        providerMessageId: "",
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown send error",
        payloadJson: { status: recipient.status, segmentKey: input.segmentKey ?? "" },
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      failedCount += 1;
    }
  }

  const status =
    failedCount === 0 ? "completed" : successCount === 0 ? "failed" : "partial";

  await getDb()
    .update(messageCampaigns)
    .set({
      successCount,
      failedCount,
      skippedCount,
      status,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(messageCampaigns.id, campaign.id));

  return {
    mode: "send" as const,
    campaignId: campaign.id,
    recipientCount: recipients.length,
    successCount,
    failedCount,
    skippedCount,
    status,
  };
}
