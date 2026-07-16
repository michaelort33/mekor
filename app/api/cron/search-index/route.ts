import { NextRequest, NextResponse } from "next/server";

import { getUniversalSearchDocuments, getUniversalSearchIndexStats } from "@/lib/search/universal";
import { isCronRequestAuthorized } from "@/lib/cron/auth";

export async function GET(request: NextRequest) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await getUniversalSearchDocuments({ refresh: true });
  const stats = await getUniversalSearchIndexStats();

  return NextResponse.json(
    {
      ok: true,
      refreshedAt: new Date().toISOString(),
      ...stats,
    },
    { status: 200 },
  );
}
