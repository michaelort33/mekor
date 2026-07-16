import { NextResponse } from "next/server";

import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import { cancelMessageCampaign } from "@/lib/messages/service";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;
  const { id } = await context.params;
  const campaignId = Number(id);
  if (!Number.isInteger(campaignId) || campaignId < 1) {
    return NextResponse.json({ error: "Invalid campaign" }, { status: 400 });
  }
  try {
    const result = await cancelMessageCampaign(campaignId);
    await writeAdminAuditLog({
      actorUserId: adminResult.actor.id,
      action: "newsletter.campaign.cancelled",
      targetType: "message_campaign",
      targetId: String(campaignId),
      payload: {},
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to cancel campaign" }, { status: 400 });
  }
}
