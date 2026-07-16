import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { messageCampaigns, messageDeliveries, newsletterDeliveryEvents, users } from "@/db/schema";
import { requireAdminActor } from "@/lib/admin/actor";

const querySchema = z.object({
  templateId: z.string().trim().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().trim().regex(/^\d+$/).transform(Number).optional(),
});

export async function GET(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    templateId: searchParams.get("templateId") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "Invalid query", issues: parsed.error.flatten() }, { status: 400 });

  const campaigns = await getDb()
    .select({
      id: messageCampaigns.id,
      templateId: messageCampaigns.templateId,
      recipientGroup: messageCampaigns.segmentKey,
      subject: messageCampaigns.subject,
      senderEmail: messageCampaigns.senderEmail,
      recipientCount: messageCampaigns.recipientCount,
      successCount: messageCampaigns.successCount,
      failedCount: messageCampaigns.failedCount,
      skippedCount: messageCampaigns.skippedCount,
      status: messageCampaigns.status,
      scheduledAt: messageCampaigns.scheduledAt,
      startedAt: messageCampaigns.startedAt,
      completedAt: messageCampaigns.completedAt,
      sentByUserId: messageCampaigns.createdByUserId,
      sentByDisplayName: users.displayName,
      sentByEmail: users.email,
    })
    .from(messageCampaigns)
    .innerJoin(users, eq(users.id, messageCampaigns.createdByUserId))
    .where(
      and(
        eq(messageCampaigns.source, "newsletter"),
        parsed.data.templateId ? eq(messageCampaigns.templateId, parsed.data.templateId) : undefined,
      ),
    )
    .orderBy(desc(messageCampaigns.createdAt), desc(messageCampaigns.id))
    .limit(Math.max(1, Math.min(parsed.data.limit ?? 20, 100)));

  const campaignIds = campaigns.map((campaign) => campaign.id);
  if (campaignIds.length === 0) return NextResponse.json({ campaigns: [], deliveriesByCampaign: {} });
  const deliveries = await getDb()
    .select({
      id: messageDeliveries.id,
      campaignId: messageDeliveries.campaignId,
      recipientEmail: messageDeliveries.recipientEmail,
      recipientName: messageDeliveries.recipientName,
      status: messageDeliveries.status,
      errorMessage: messageDeliveries.errorMessage,
      sentAt: messageDeliveries.sentAt,
      createdAt: messageDeliveries.createdAt,
    })
    .from(messageDeliveries)
    .where(inArray(messageDeliveries.campaignId, campaignIds))
    .orderBy(desc(messageDeliveries.createdAt))
    .limit(500);

  const providerEvents = await getDb()
    .select({
      campaignId: messageDeliveries.campaignId,
      eventType: newsletterDeliveryEvents.eventType,
    })
    .from(newsletterDeliveryEvents)
    .innerJoin(messageDeliveries, eq(messageDeliveries.id, newsletterDeliveryEvents.deliveryId))
    .where(inArray(messageDeliveries.campaignId, campaignIds));

  const deliveriesByCampaign: Record<string, typeof deliveries> = {};
  for (const delivery of deliveries) {
    const key = String(delivery.campaignId);
    deliveriesByCampaign[key] ??= [];
    if (deliveriesByCampaign[key]!.length < 20) deliveriesByCampaign[key]!.push(delivery);
  }
  const eventCountsByCampaign: Record<string, Record<string, number>> = {};
  for (const event of providerEvents) {
    const key = String(event.campaignId);
    eventCountsByCampaign[key] ??= {};
    eventCountsByCampaign[key]![event.eventType] = (eventCountsByCampaign[key]![event.eventType] ?? 0) + 1;
  }
  return NextResponse.json({ campaigns, deliveriesByCampaign, eventCountsByCampaign });
}
