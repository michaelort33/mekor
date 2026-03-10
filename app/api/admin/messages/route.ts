import { and, desc, eq, ilike, lt, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import {
  adminInboxEvents,
  automatedMessageLog,
  duesNotificationLog,
  messageCampaigns,
  messageDeliveries,
  newsletterCampaignDeliveries,
  newsletterCampaigns,
  people,
  users,
} from "@/db/schema";
import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import { getCategoryLabel, type AdminNotificationCategory } from "@/lib/admin/inbox";
import { MESSAGE_SEGMENT_LABELS, MESSAGE_SEGMENTS } from "@/lib/messages/segments";
import { sendMessageCampaign } from "@/lib/messages/service";
import { decodeCursor, parsePageLimit } from "@/lib/pagination/cursor";

const messagesCursorSchema = z.object({
  createdAt: z.string().datetime(),
});

const sendPayloadSchema = z.object({
  mode: z.enum(["preview", "send"]).default("send"),
  channel: z.enum(["email", "sms", "whatsapp"]).default("email"),
  name: z.string().trim().min(2).max(180).optional(),
  subject: z.string().trim().min(2).max(255),
  body: z.string().min(2).max(120000),
  segmentKey: z.enum(MESSAGE_SEGMENTS).optional(),
  personIds: z.array(z.number().int().min(1)).max(500).optional(),
});

type UnifiedMessageLogItem = {
  id: string;
  direction: "inbound" | "outbound";
  source: "manual" | "newsletter" | "automated" | "dues" | "form_submission" | "mailchimp_signup";
  channel: "email";
  status: "new" | "read" | "archived" | "sent" | "failed" | "skipped";
  recipientName: string;
  recipientEmail: string;
  subject: string;
  provider: string;
  providerMessageId: string;
  errorMessage: string;
  createdAt: string;
  sentAt: string | null;
  actorEmail: string;
  campaignName: string;
  segmentLabel: string;
  category: string;
  summary: string;
  payloadJson: Record<string, unknown>;
  sourceRecordLabel: string;
  sourceRecordHref: string;
};

function sortByCreatedAtDesc(items: UnifiedMessageLogItem[]) {
  return [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function getSegmentLabel(value: string) {
  if (value in MESSAGE_SEGMENT_LABELS) {
    return MESSAGE_SEGMENT_LABELS[value as keyof typeof MESSAGE_SEGMENT_LABELS];
  }
  return value || "Manual";
}

function normalizeManualStatus(value: string): "sent" | "failed" | "skipped" {
  if (value === "sent") return "sent";
  if (value === "failed") return "failed";
  return "skipped";
}

function normalizeSentFailedStatus(value: string): "sent" | "failed" {
  return value === "sent" ? "sent" : "failed";
}

export async function GET(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const source = searchParams.get("source")?.trim() ?? "";
  const status = searchParams.get("status")?.trim() ?? "";
  const direction = searchParams.get("direction")?.trim() ?? "";
  const category = searchParams.get("category")?.trim() ?? "";
  const selectedInboundId = searchParams.get("id")?.trim() ?? "";
  const limit = parsePageLimit(searchParams.get("limit"));
  const parsedCursor = decodeCursor(searchParams.get("cursor"), messagesCursorSchema);
  if (parsedCursor.error) {
    return NextResponse.json({ error: parsedCursor.error }, { status: 400 });
  }
  const cursor = parsedCursor.value;
  const beforeDate = cursor ? new Date(cursor.createdAt) : null;
  const perSourceLimit = Math.max(30, limit * 3);

  const inboundRows =
    direction === "outbound"
      ? []
      : await getDb()
          .select({
            id: adminInboxEvents.id,
            sourceType: adminInboxEvents.sourceType,
            category: adminInboxEvents.category,
            sourceId: adminInboxEvents.sourceId,
            title: adminInboxEvents.title,
            submitterName: adminInboxEvents.submitterName,
            submitterEmail: adminInboxEvents.submitterEmail,
            submitterPhone: adminInboxEvents.submitterPhone,
            summary: adminInboxEvents.summary,
            payloadJson: adminInboxEvents.payloadJson,
            status: adminInboxEvents.status,
            createdAt: adminInboxEvents.createdAt,
            updatedAt: adminInboxEvents.updatedAt,
          })
          .from(adminInboxEvents)
          .where(
            and(
              source === "form_submission" || source === "mailchimp_signup"
                ? eq(adminInboxEvents.sourceType, source as "form_submission" | "mailchimp_signup")
                : undefined,
              status === "new" || status === "read" || status === "archived"
                ? eq(adminInboxEvents.status, status)
                : undefined,
              category ? eq(adminInboxEvents.category, category as AdminNotificationCategory) : undefined,
              selectedInboundId ? eq(adminInboxEvents.id, Number(selectedInboundId)) : undefined,
              q
                ? or(
                    ilike(adminInboxEvents.title, `%${q}%`),
                    ilike(adminInboxEvents.submitterName, `%${q}%`),
                    ilike(adminInboxEvents.submitterEmail, `%${q}%`),
                    ilike(adminInboxEvents.summary, `%${q}%`),
                  )
                : undefined,
              beforeDate ? lt(adminInboxEvents.createdAt, beforeDate) : undefined,
            ),
          )
          .orderBy(desc(adminInboxEvents.createdAt), desc(adminInboxEvents.id))
          .limit(perSourceLimit);

  const manualRows =
    direction === "inbound" || (source && source !== "manual")
      ? []
      : await getDb()
          .select({
            id: messageDeliveries.id,
            recipientName: messageDeliveries.recipientName,
            recipientEmail: messageDeliveries.recipientEmail,
            provider: messageDeliveries.provider,
            providerMessageId: messageDeliveries.providerMessageId,
            status: messageDeliveries.status,
            errorMessage: messageDeliveries.errorMessage,
            createdAt: messageDeliveries.createdAt,
            sentAt: messageDeliveries.sentAt,
            subject: messageCampaigns.subject,
            campaignName: messageCampaigns.name,
            segmentKey: messageCampaigns.segmentKey,
            actorEmail: users.email,
          })
          .from(messageDeliveries)
          .innerJoin(messageCampaigns, eq(messageCampaigns.id, messageDeliveries.campaignId))
          .innerJoin(users, eq(users.id, messageCampaigns.createdByUserId))
          .where(
            and(
              q
                ? or(
                    ilike(messageDeliveries.recipientEmail, `%${q}%`),
                    ilike(messageDeliveries.recipientName, `%${q}%`),
                    ilike(messageCampaigns.subject, `%${q}%`),
                  )
                : undefined,
              status === "sent" || status === "failed" || status === "skipped"
                ? eq(messageDeliveries.status, status)
                : undefined,
              beforeDate ? lt(messageDeliveries.createdAt, beforeDate) : undefined,
            ),
          )
          .orderBy(desc(messageDeliveries.createdAt), desc(messageDeliveries.id))
          .limit(perSourceLimit);

  const newsletterRows =
    direction === "inbound" || (source && source !== "newsletter")
      ? []
      : await getDb()
          .select({
            id: newsletterCampaignDeliveries.id,
            recipientName: newsletterCampaignDeliveries.recipientName,
            recipientEmail: newsletterCampaignDeliveries.recipientEmail,
            provider: newsletterCampaignDeliveries.provider,
            providerMessageId: newsletterCampaignDeliveries.providerMessageId,
            status: newsletterCampaignDeliveries.status,
            errorMessage: newsletterCampaignDeliveries.errorMessage,
            createdAt: newsletterCampaignDeliveries.createdAt,
            sentAt: newsletterCampaignDeliveries.sentAt,
            subject: newsletterCampaigns.subject,
            campaignName: newsletterCampaigns.recipientGroup,
            actorEmail: users.email,
          })
          .from(newsletterCampaignDeliveries)
          .innerJoin(newsletterCampaigns, eq(newsletterCampaigns.id, newsletterCampaignDeliveries.campaignId))
          .innerJoin(users, eq(users.id, newsletterCampaigns.sentByUserId))
          .where(
            and(
              q
                ? or(
                    ilike(newsletterCampaignDeliveries.recipientEmail, `%${q}%`),
                    ilike(newsletterCampaignDeliveries.recipientName, `%${q}%`),
                    ilike(newsletterCampaigns.subject, `%${q}%`),
                  )
                : undefined,
              status === "sent" || status === "failed"
                ? eq(newsletterCampaignDeliveries.status, status)
                : undefined,
              beforeDate ? lt(newsletterCampaignDeliveries.createdAt, beforeDate) : undefined,
            ),
          )
          .orderBy(desc(newsletterCampaignDeliveries.createdAt), desc(newsletterCampaignDeliveries.id))
          .limit(perSourceLimit);

  const automatedRows =
    direction === "inbound" || (source && source !== "automated")
      ? []
      : await getDb()
          .select({
            id: automatedMessageLog.id,
            recipientEmail: automatedMessageLog.recipientEmail,
            subject: automatedMessageLog.subject,
            provider: automatedMessageLog.provider,
            providerMessageId: automatedMessageLog.providerMessageId,
            status: automatedMessageLog.deliveryStatus,
            errorMessage: automatedMessageLog.errorMessage,
            createdAt: automatedMessageLog.createdAt,
            sentAt: automatedMessageLog.sentAt,
            displayName: users.displayName,
            actorEmail: users.email,
          })
          .from(automatedMessageLog)
          .innerJoin(users, eq(users.id, automatedMessageLog.userId))
          .where(
            and(
              q
                ? or(
                    ilike(automatedMessageLog.recipientEmail, `%${q}%`),
                    ilike(users.displayName, `%${q}%`),
                    ilike(automatedMessageLog.subject, `%${q}%`),
                  )
                : undefined,
              status === "sent" || status === "failed" ? eq(automatedMessageLog.deliveryStatus, status) : undefined,
              beforeDate ? lt(automatedMessageLog.createdAt, beforeDate) : undefined,
            ),
          )
          .orderBy(desc(automatedMessageLog.createdAt), desc(automatedMessageLog.id))
          .limit(perSourceLimit);

  const duesRows =
    direction === "inbound" || (source && source !== "dues")
      ? []
      : await getDb()
          .select({
            id: duesNotificationLog.id,
            recipientEmail: people.email,
            displayName: people.displayName,
            provider: duesNotificationLog.provider,
            providerMessageId: duesNotificationLog.providerMessageId,
            status: duesNotificationLog.deliveryStatus,
            errorMessage: duesNotificationLog.errorMessage,
            createdAt: duesNotificationLog.createdAt,
            type: duesNotificationLog.notificationType,
          })
          .from(duesNotificationLog)
          .innerJoin(users, eq(users.id, duesNotificationLog.userId))
          .innerJoin(people, eq(people.userId, users.id))
          .where(
            and(
              q
                ? or(
                    ilike(people.email, `%${q}%`),
                    ilike(people.displayName, `%${q}%`),
                    ilike(duesNotificationLog.notificationType, `%${q}%`),
                  )
                : undefined,
              status === "sent" || status === "failed" ? eq(duesNotificationLog.deliveryStatus, status) : undefined,
              beforeDate ? lt(duesNotificationLog.createdAt, beforeDate) : undefined,
            ),
          )
          .orderBy(desc(duesNotificationLog.createdAt), desc(duesNotificationLog.id))
          .limit(perSourceLimit);

  const merged: UnifiedMessageLogItem[] = [
    ...inboundRows.map((row) => ({
      id: `inbound:${row.id}`,
      direction: "inbound" as const,
      source: row.sourceType,
      channel: "email" as const,
      status: row.status,
      recipientName: row.submitterName,
      recipientEmail: row.submitterEmail,
      subject: row.title,
      provider: "inbound",
      providerMessageId: row.sourceId,
      errorMessage: "",
      createdAt: row.createdAt.toISOString(),
      sentAt: null,
      actorEmail: "public",
      campaignName: getCategoryLabel(row.category),
      segmentLabel: row.sourceType,
      category: row.category,
      summary: row.summary,
      payloadJson: row.payloadJson,
      sourceRecordLabel: `${row.sourceType} #${row.sourceId}`,
      sourceRecordHref: `/admin/messages?direction=inbound&id=${row.id}`,
    })),
    ...manualRows.map((row) => ({
      id: `manual:${row.id}`,
      direction: "outbound" as const,
      source: "manual" as const,
      channel: "email" as const,
      status: normalizeManualStatus(row.status),
      recipientName: row.recipientName,
      recipientEmail: row.recipientEmail,
      subject: row.subject,
      provider: row.provider,
      providerMessageId: row.providerMessageId,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt.toISOString(),
      sentAt: row.sentAt ? row.sentAt.toISOString() : null,
      actorEmail: row.actorEmail,
      campaignName: row.campaignName,
      segmentLabel: getSegmentLabel(row.segmentKey),
      category: "outbound",
      summary: row.subject,
      payloadJson: {},
      sourceRecordLabel: `manual #${row.id}`,
      sourceRecordHref: "/admin/messages?direction=outbound&source=manual",
    })),
    ...newsletterRows.map((row) => ({
      id: `newsletter:${row.id}`,
      direction: "outbound" as const,
      source: "newsletter" as const,
      channel: "email" as const,
      status: normalizeSentFailedStatus(row.status),
      recipientName: row.recipientName,
      recipientEmail: row.recipientEmail,
      subject: row.subject,
      provider: row.provider,
      providerMessageId: row.providerMessageId,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt.toISOString(),
      sentAt: row.sentAt ? row.sentAt.toISOString() : null,
      actorEmail: row.actorEmail,
      campaignName: `Newsletter: ${row.campaignName}`,
      segmentLabel: row.campaignName,
      category: "outbound",
      summary: row.subject,
      payloadJson: {},
      sourceRecordLabel: `newsletter #${row.id}`,
      sourceRecordHref: "/admin/messages?direction=outbound&source=newsletter",
    })),
    ...automatedRows.map((row) => ({
      id: `automated:${row.id}`,
      direction: "outbound" as const,
      source: "automated" as const,
      channel: "email" as const,
      status: normalizeSentFailedStatus(row.status),
      recipientName: row.displayName,
      recipientEmail: row.recipientEmail,
      subject: row.subject,
      provider: row.provider,
      providerMessageId: row.providerMessageId,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt.toISOString(),
      sentAt: row.sentAt ? row.sentAt.toISOString() : null,
      actorEmail: "system",
      campaignName: "Automated reminder",
      segmentLabel: "Automated",
      category: "outbound",
      summary: row.subject,
      payloadJson: {},
      sourceRecordLabel: `automated #${row.id}`,
      sourceRecordHref: "/admin/messages?direction=outbound&source=automated",
    })),
    ...duesRows.map((row) => ({
      id: `dues:${row.id}`,
      direction: "outbound" as const,
      source: "dues" as const,
      channel: "email" as const,
      status: normalizeSentFailedStatus(row.status),
      recipientName: row.displayName,
      recipientEmail: row.recipientEmail,
      subject: `[Dues] ${row.type}`,
      provider: row.provider,
      providerMessageId: row.providerMessageId,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt.toISOString(),
      sentAt: row.createdAt.toISOString(),
      actorEmail: "system",
      campaignName: "Dues notification",
      segmentLabel: row.type,
      category: "outbound",
      summary: row.type,
      payloadJson: {},
      sourceRecordLabel: `dues #${row.id}`,
      sourceRecordHref: "/admin/messages?direction=outbound&source=dues",
    })),
  ];

  const sorted = sortByCreatedAtDesc(merged);
  const items = sorted.slice(0, limit);
  const hasNextPage = sorted.length > limit;
  const nextCursor =
    hasNextPage && items.length > 0
      ? Buffer.from(JSON.stringify({ createdAt: items[items.length - 1]!.createdAt })).toString("base64url")
      : null;

  return NextResponse.json({
    items,
    pageInfo: {
      nextCursor,
      hasNextPage,
      limit,
    },
    segments: MESSAGE_SEGMENTS.map((key) => ({ key, label: MESSAGE_SEGMENT_LABELS[key] })),
  });
}

export async function POST(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;
  const actor = adminResult.actor;

  const parsed = sendPayloadSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await sendMessageCampaign({
      actorUserId: actor.id,
      actorRole: actor.role,
      source: "manual",
      channel: parsed.data.channel,
      name: parsed.data.name || "Manual campaign",
      subject: parsed.data.subject,
      body: parsed.data.body,
      segmentKey: parsed.data.segmentKey,
      personIds: parsed.data.personIds,
      previewOnly: parsed.data.mode === "preview",
    });

    await writeAdminAuditLog({
      actorUserId: actor.id,
      action: parsed.data.mode === "preview" ? "messages.previewed" : "messages.sent",
      targetType: "message_campaign",
      targetId: parsed.data.mode === "preview" ? "preview" : String("campaignId" in result ? result.campaignId : ""),
      payload: {
        mode: parsed.data.mode,
        channel: parsed.data.channel,
        segmentKey: parsed.data.segmentKey ?? null,
        personIdsCount: parsed.data.personIds?.length ?? 0,
        recipientCount: result.recipientCount,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to process campaign" }, { status: 400 });
  }
}
