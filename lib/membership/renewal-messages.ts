import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { automatedMessageLog } from "@/db/schema";
import { sendSendGridEmail } from "@/lib/notifications/sendgrid";

const RENEWAL_REMINDER_DAYS = 7;

function dateOnlyUtc(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function daysUntilRenewal(input: { renewalDate: Date; now: Date }) {
  const renewalStart = Date.parse(`${dateOnlyUtc(input.renewalDate)}T00:00:00.000Z`);
  const nowStart = Date.parse(`${dateOnlyUtc(input.now)}T00:00:00.000Z`);
  return Math.round((renewalStart - nowStart) / 86_400_000);
}

export function shouldSendRenewalReminder(input: { renewalDate: Date; now: Date }) {
  return daysUntilRenewal(input) === RENEWAL_REMINDER_DAYS;
}

function buildRenewalSubject() {
  return "[Mekor Membership] Renewal reminder";
}

function buildRenewalBody(input: {
  displayName: string;
  renewalDate: string;
  duesUrl: string;
}) {
  return [
    `Hi ${input.displayName},`,
    "",
    `This is a reminder that your membership renews on ${input.renewalDate}.`,
    "Please review and complete your renewal payment from your dues page:",
    input.duesUrl,
    "",
    "Thank you for being part of Mekor Habracha.",
  ].join("\n");
}

export async function sendMembershipRenewalReminder(input: {
  userId: number;
  userEmail: string;
  displayName: string;
  renewalDate: string;
  duesUrl: string;
}) {
  const db = getDb();
  const [existingSent] = await db
    .select({
      id: automatedMessageLog.id,
    })
    .from(automatedMessageLog)
    .where(
      and(
        eq(automatedMessageLog.userId, input.userId),
        eq(automatedMessageLog.messageType, "membership_renewal_reminder"),
        eq(automatedMessageLog.membershipRenewalDate, input.renewalDate),
        eq(automatedMessageLog.deliveryStatus, "sent"),
      ),
    )
    .limit(1);

  if (existingSent) {
    return { sent: false, deduped: true };
  }

  const subject = buildRenewalSubject();
  const body = buildRenewalBody({
    displayName: input.displayName,
    renewalDate: input.renewalDate,
    duesUrl: input.duesUrl,
  });

  try {
    const sent = await sendSendGridEmail({
      to: input.userEmail,
      subject,
      text: body,
    });

    await db
      .insert(automatedMessageLog)
      .values({
        userId: input.userId,
        messageType: "membership_renewal_reminder",
        membershipRenewalDate: input.renewalDate,
        recipientEmail: input.userEmail,
        subject,
        body,
        provider: "sendgrid",
        providerMessageId: sent.providerMessageId,
        deliveryStatus: "sent",
        errorMessage: "",
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          automatedMessageLog.userId,
          automatedMessageLog.messageType,
          automatedMessageLog.membershipRenewalDate,
        ],
        set: {
          recipientEmail: input.userEmail,
          subject,
          body,
          provider: "sendgrid",
          providerMessageId: sent.providerMessageId,
          deliveryStatus: "sent",
          errorMessage: "",
          sentAt: new Date(),
          updatedAt: new Date(),
        },
      });

    return { sent: true, deduped: false };
  } catch (error) {
    await db
      .insert(automatedMessageLog)
      .values({
        userId: input.userId,
        messageType: "membership_renewal_reminder",
        membershipRenewalDate: input.renewalDate,
        recipientEmail: input.userEmail,
        subject,
        body,
        provider: "sendgrid",
        providerMessageId: "",
        deliveryStatus: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown send failure",
        sentAt: null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          automatedMessageLog.userId,
          automatedMessageLog.messageType,
          automatedMessageLog.membershipRenewalDate,
        ],
        set: {
          recipientEmail: input.userEmail,
          subject,
          body,
          provider: "sendgrid",
          providerMessageId: "",
          deliveryStatus: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown send failure",
          sentAt: null,
          updatedAt: new Date(),
        },
      });

    return { sent: false, deduped: false };
  }
}
