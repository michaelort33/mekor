import { desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { newsletterCampaignDeliveries, newsletterCampaigns, users } from "@/db/schema";
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
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", issues: parsed.error.flatten() }, { status: 400 });
  }

  const limit = Math.max(1, Math.min(parsed.data.limit ?? 20, 100));

  const campaigns = await getDb()
    .select({
      id: newsletterCampaigns.id,
      templateId: newsletterCampaigns.templateId,
      recipientGroup: newsletterCampaigns.recipientGroup,
      subject: newsletterCampaigns.subject,
      senderEmail: newsletterCampaigns.senderEmail,
      recipientCount: newsletterCampaigns.recipientCount,
      successCount: newsletterCampaigns.successCount,
      failedCount: newsletterCampaigns.failedCount,
      status: newsletterCampaigns.status,
      startedAt: newsletterCampaigns.startedAt,
      completedAt: newsletterCampaigns.completedAt,
      sentByUserId: newsletterCampaigns.sentByUserId,
      sentByDisplayName: users.displayName,
      sentByEmail: users.email,
    })
    .from(newsletterCampaigns)
    .innerJoin(users, eq(users.id, newsletterCampaigns.sentByUserId))
    .where(
      parsed.data.templateId
        ? eq(newsletterCampaigns.templateId, parsed.data.templateId)
        : undefined,
    )
    .orderBy(desc(newsletterCampaigns.startedAt), desc(newsletterCampaigns.id))
    .limit(limit);

  if (campaigns.length === 0) {
    return NextResponse.json({ campaigns: [], deliveriesByCampaign: {} });
  }

  const campaignIds = campaigns.map((campaign) => campaign.id);
  const deliveries = await getDb()
    .select({
      id: newsletterCampaignDeliveries.id,
      campaignId: newsletterCampaignDeliveries.campaignId,
      recipientEmail: newsletterCampaignDeliveries.recipientEmail,
      recipientName: newsletterCampaignDeliveries.recipientName,
      status: newsletterCampaignDeliveries.status,
      errorMessage: newsletterCampaignDeliveries.errorMessage,
      sentAt: newsletterCampaignDeliveries.sentAt,
      createdAt: newsletterCampaignDeliveries.createdAt,
    })
    .from(newsletterCampaignDeliveries)
    .where(inArray(newsletterCampaignDeliveries.campaignId, campaignIds))
    .orderBy(desc(newsletterCampaignDeliveries.createdAt))
    .limit(500);

  const allowedCampaignIds = new Set(campaignIds);
  const deliveriesByCampaign: Record<string, typeof deliveries> = {};
  for (const delivery of deliveries) {
    if (!allowedCampaignIds.has(delivery.campaignId)) continue;
    if (!deliveriesByCampaign[String(delivery.campaignId)]) {
      deliveriesByCampaign[String(delivery.campaignId)] = [];
    }
    if (deliveriesByCampaign[String(delivery.campaignId)]!.length < 20) {
      deliveriesByCampaign[String(delivery.campaignId)]!.push(delivery);
    }
  }

  return NextResponse.json({ campaigns, deliveriesByCampaign });
}
