import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { paymentCampaigns } from "@/db/schema";
import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import { createPaymentCampaign, updatePaymentCampaign } from "@/lib/payments/service";

const createCampaignSchema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(4000).default(""),
  designationLabel: z.string().trim().max(160).default(""),
  targetAmountCents: z.number().int().min(0).nullable().default(null),
  suggestedAmountCents: z.number().int().min(0).nullable().default(null),
  status: z.enum(["draft", "active", "closed", "archived"]).default("draft"),
});

const updateCampaignSchema = createCampaignSchema.extend({
  id: z.number().int().min(1),
});

export async function GET() {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const campaigns = await getDb()
    .select()
    .from(paymentCampaigns)
    .orderBy(desc(paymentCampaigns.updatedAt), desc(paymentCampaigns.id));

  return NextResponse.json({ campaigns });
}

export async function POST(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const parsed = createCampaignSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const campaign = await createPaymentCampaign({
    createdByUserId: adminResult.actor.id,
    ...parsed.data,
  });

  await writeAdminAuditLog({
    actorUserId: adminResult.actor.id,
    action: "payment_campaign.created",
    targetType: "payment_campaign",
    targetId: String(campaign.id),
    payload: {
      title: campaign.title,
      status: campaign.status,
      shareablePath: campaign.shareablePath,
    },
  });

  return NextResponse.json({ campaign }, { status: 201 });
}

export async function PUT(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const parsed = updateCampaignSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await getDb()
    .select({ id: paymentCampaigns.id })
    .from(paymentCampaigns)
    .where(eq(paymentCampaigns.id, parsed.data.id))
    .limit(1);
  if (existing.length === 0) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const campaign = await updatePaymentCampaign(parsed.data);
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  await writeAdminAuditLog({
    actorUserId: adminResult.actor.id,
    action: "payment_campaign.updated",
    targetType: "payment_campaign",
    targetId: String(campaign.id),
    payload: {
      title: campaign.title,
      status: campaign.status,
    },
  });

  return NextResponse.json({ campaign });
}
