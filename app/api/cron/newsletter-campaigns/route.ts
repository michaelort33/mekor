import { NextRequest, NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/cron/auth";
import { processDueMessageCampaigns } from "@/lib/messages/service";
import { resolveSiteOriginFromRequest } from "@/lib/site-origin";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const results = await processDueMessageCampaigns(25, resolveSiteOriginFromRequest(request));
  return NextResponse.json({ ok: true, processedAt: new Date().toISOString(), campaigns: results });
}
