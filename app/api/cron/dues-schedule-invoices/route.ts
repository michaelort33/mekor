import { NextRequest, NextResponse } from "next/server";

import { featureDisabledResponse, isFeatureEnabled } from "@/lib/config/features";
import { isCronRequestAuthorized } from "@/lib/cron/auth";
import { runDuesScheduleInvoicing } from "@/lib/dues/schedule-invoicing";

export async function GET(request: NextRequest) {
  if (!(await isFeatureEnabled("FEATURE_DUES"))) {
    return NextResponse.json(featureDisabledResponse("FEATURE_DUES"), { status: 404 });
  }

  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runDuesScheduleInvoicing();
  return NextResponse.json(result);
}
