import crypto from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { Resend } from "resend";

import { getDb } from "@/db/client";
import { householdMembers, memberMessageRelays, memberMessageRequests } from "@/db/schema";
import { getFormNotifyFrom, getFormNotifyTo, getResendApiKey } from "@/lib/forms/config";

function getRelaySecret() {
  const secret =
    process.env.MEMBER_CONNECT_TOKEN_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "member-connect-dev-secret";
  return secret;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signTokenPayload(payload: string) {
  return crypto.createHmac("sha256", getRelaySecret()).update(payload).digest("hex");
}

function createReplyToken(data: { requestId: number; email: string; exp: number }) {
  const payload = base64UrlEncode(JSON.stringify(data));
  const sig = signTokenPayload(payload);
  return `${payload}.${sig}`;
}

function verifyReplyToken(token: string) {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) {
    return null;
  }

  const expectedSig = signTokenPayload(payload);
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return null;
  }

  const parsed = JSON.parse(base64UrlDecode(payload)) as { requestId: number; email: string; exp: number };
  if (!parsed.requestId || !parsed.email || !parsed.exp || parsed.exp < Date.now()) {
    return null;
  }

  return parsed;
}

async function deliverRelayEmail(to: string, subject: string, text: string) {
  const resend = new Resend(getResendApiKey());
  await resend.emails.send({
    from: getFormNotifyFrom(),
    to: [to],
    subject,
    text,
  });
}

export async function listConnectRecipients() {
  const db = getDb();
  const rows = await db
    .select({
      id: householdMembers.id,
      displayName: householdMembers.displayName,
    })
    .from(householdMembers)
    .where(eq(householdMembers.isActive, true))
    .orderBy(sql`${householdMembers.displayName} asc`);

  return rows;
}

export async function createMessageRequest(input: {
  senderMemberId?: number;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  recipientMemberId: number;
  subject: string;
  message: string;
}) {
  const db = getDb();

  const [recipient] = await db
    .select({
      id: householdMembers.id,
      displayName: householdMembers.displayName,
      email: householdMembers.email,
      isActive: householdMembers.isActive,
    })
    .from(householdMembers)
    .where(eq(householdMembers.id, input.recipientMemberId))
    .limit(1);

  if (!recipient || !recipient.isActive) {
    throw new Error("Recipient is not available");
  }

  const [created] = await db
    .insert(memberMessageRequests)
    .values({
      senderMemberId: input.senderMemberId,
      senderName: input.senderName,
      senderEmail: input.senderEmail,
      senderPhone: input.senderPhone,
      recipientMemberId: recipient.id,
      recipientDisplayName: recipient.displayName,
      subject: input.subject,
      message: input.message,
      status: "pending_review",
    })
    .returning({
      id: memberMessageRequests.id,
      status: memberMessageRequests.status,
      recipientDisplayName: memberMessageRequests.recipientDisplayName,
      createdAt: memberMessageRequests.createdAt,
    });

  if (!created) {
    throw new Error("Failed to create message request");
  }

  return created;
}

export async function approveMessageRequest(requestId: number, adminNote = "") {
  const db = getDb();
  const now = new Date();

  const [updated] = await db
    .update(memberMessageRequests)
    .set({ status: "approved", approvedAt: now, adminNote, updatedAt: now })
    .where(eq(memberMessageRequests.id, requestId))
    .returning({
      id: memberMessageRequests.id,
      status: memberMessageRequests.status,
      approvedAt: memberMessageRequests.approvedAt,
    });

  if (!updated) {
    throw new Error("Message request not found");
  }

  return updated;
}

export async function rejectMessageRequest(requestId: number, adminNote = "") {
  const db = getDb();
  const now = new Date();

  const [updated] = await db
    .update(memberMessageRequests)
    .set({ status: "rejected", rejectedAt: now, adminNote, updatedAt: now })
    .where(eq(memberMessageRequests.id, requestId))
    .returning({
      id: memberMessageRequests.id,
      status: memberMessageRequests.status,
      rejectedAt: memberMessageRequests.rejectedAt,
    });

  if (!updated) {
    throw new Error("Message request not found");
  }

  return updated;
}

export async function relayMessageFromAdmin(input: {
  requestId: number;
  to: "sender" | "recipient";
  subject: string;
  message: string;
}) {
  const db = getDb();
  const [request] = await db
    .select()
    .from(memberMessageRequests)
    .where(eq(memberMessageRequests.id, input.requestId))
    .limit(1);

  if (!request) {
    throw new Error("Message request not found");
  }

  if (request.status !== "approved") {
    throw new Error("Message request must be approved before relaying");
  }

  const [recipient] = await db
    .select({ email: householdMembers.email, displayName: householdMembers.displayName })
    .from(householdMembers)
    .where(eq(householdMembers.id, request.recipientMemberId))
    .limit(1);

  const targetEmail = input.to === "sender" ? request.senderEmail : recipient?.email ?? "";
  if (!targetEmail) {
    throw new Error("Target email is not available");
  }

  let body = input.message;
  if (input.to === "recipient") {
    const token = createReplyToken({
      requestId: request.id,
      email: targetEmail,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 30,
    });
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    body = `${body}\n\nTo reply privately through Mekor: ${baseUrl}/member-connect/reply?token=${encodeURIComponent(token)}`;
  }

  const now = new Date();
  let deliveryStatus = "sent";
  let errorMessage = "";

  try {
    await deliverRelayEmail(targetEmail, input.subject || "Mekor Member Message", body);
  } catch (error) {
    deliveryStatus = "failed";
    errorMessage = String(error).slice(0, 512);
  }

  const [relay] = await db
    .insert(memberMessageRelays)
    .values({
      requestId: request.id,
      direction: `admin_to_${input.to}`,
      fromRole: "admin",
      toRole: input.to,
      toEmail: targetEmail,
      subject: input.subject,
      message: body,
      deliveryStatus,
      errorMessage,
    })
    .returning({
      id: memberMessageRelays.id,
      requestId: memberMessageRelays.requestId,
      deliveryStatus: memberMessageRelays.deliveryStatus,
    });

  if (!relay) {
    throw new Error("Failed to log relay");
  }

  return relay;
}

export async function recordRecipientReply(input: { token: string; message: string }) {
  const token = verifyReplyToken(input.token);
  if (!token) {
    throw new Error("Invalid or expired reply token");
  }

  const db = getDb();
  const [request] = await db
    .select()
    .from(memberMessageRequests)
    .where(and(eq(memberMessageRequests.id, token.requestId), eq(memberMessageRequests.status, "approved")))
    .limit(1);

  if (!request) {
    throw new Error("Message request is not active");
  }

  const now = new Date();
  const toEmail = getFormNotifyTo();
  const subject = `Reply received: request #${request.id}`;
  const text = [
    `Message Request ID: ${request.id}`,
    `Recipient: ${request.recipientDisplayName}`,
    `Reply Timestamp: ${now.toISOString()}`,
    "",
    input.message,
  ].join("\n");

  let deliveryStatus = "sent";
  let errorMessage = "";
  try {
    await deliverRelayEmail(toEmail, subject, text);
  } catch (error) {
    deliveryStatus = "failed";
    errorMessage = String(error).slice(0, 512);
  }

  const [relay] = await db
    .insert(memberMessageRelays)
    .values({
      requestId: request.id,
      direction: "recipient_reply",
      fromRole: "recipient",
      toRole: "admin",
      toEmail,
      subject,
      message: input.message,
      deliveryStatus,
      errorMessage,
    })
    .returning({ id: memberMessageRelays.id, requestId: memberMessageRelays.requestId });

  if (!relay) {
    throw new Error("Failed to record recipient reply");
  }

  return relay;
}
