import { NextRequest, NextResponse } from "next/server";

import { getUniversalSearchDocuments, getUniversalSearchIndexStats } from "@/lib/search/universal";

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
