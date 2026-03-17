import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { getHebrewYearContext } from "@/lib/calendar/hebrew-year";

const HEBREW_YEAR_PATHS = ["/membership", "/auxiliary-membership"] as const;

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

  for (const path of HEBREW_YEAR_PATHS) {
    revalidatePath(path);
  }

  return NextResponse.json(
    {
      ok: true,
      ...getHebrewYearContext(),
      revalidatedPaths: HEBREW_YEAR_PATHS,
      refreshedAt: new Date().toISOString(),
    },
    { status: 200 },
  );
}
