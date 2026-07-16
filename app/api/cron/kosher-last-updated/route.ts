import { NextRequest, NextResponse } from "next/server";

import { refreshKosherDirectoryLastUpdatedIfStale } from "@/lib/kosher/store";
import { isCronRequestAuthorized } from "@/lib/cron/auth";

const MAX_AGE_DAYS = 14;
const FRESHNESS_KEY = "center-city";

export async function GET(request: NextRequest) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await refreshKosherDirectoryLastUpdatedIfStale(FRESHNESS_KEY, MAX_AGE_DAYS);
  return NextResponse.json(result, { status: 200 });
}
