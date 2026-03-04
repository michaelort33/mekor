import { NextRequest, NextResponse } from "next/server";

import { featureDisabledResponse, isFeatureEnabled } from "@/lib/config/features";
import { runDuesScheduleInvoicing } from "@/lib/dues/schedule-invoicing";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return true;
  }

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!(await isFeatureEnabled("FEATURE_DUES"))) {
    return NextResponse.json(featureDisabledResponse("FEATURE_DUES"), { status: 404 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runDuesScheduleInvoicing();
  return NextResponse.json(result);
}
