import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { getHebrewYearContext } from "@/lib/calendar/hebrew-year";
import { isCronRequestAuthorized } from "@/lib/cron/auth";

const HEBREW_YEAR_PATHS = ["/membership", "/auxiliary-membership"] as const;

export async function GET(request: NextRequest) {
  if (!isCronRequestAuthorized(request)) {
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
