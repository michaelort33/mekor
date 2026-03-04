import { NextResponse } from "next/server";

import { requireAdminActor } from "@/lib/admin/actor";
import { featureDisabledResponse, isFeatureEnabled } from "@/lib/config/features";
import { runDuesScheduleInvoicing } from "@/lib/dues/schedule-invoicing";

export async function POST() {
  if (!(await isFeatureEnabled("FEATURE_DUES"))) {
    return NextResponse.json(featureDisabledResponse("FEATURE_DUES"), { status: 404 });
  }

  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const result = await runDuesScheduleInvoicing();
  return NextResponse.json(result);
}
