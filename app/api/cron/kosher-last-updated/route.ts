import { NextRequest, NextResponse } from "next/server";

import { refreshKosherDirectoryLastUpdatedIfStale } from "@/lib/kosher/store";

const MAX_AGE_DAYS = 14;
const FRESHNESS_KEY = "center-city";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return true;
  }

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await refreshKosherDirectoryLastUpdatedIfStale(FRESHNESS_KEY, MAX_AGE_DAYS);
  return NextResponse.json(result, { status: 200 });
}
