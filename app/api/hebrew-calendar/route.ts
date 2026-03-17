import { NextResponse } from "next/server";

import { getHebrewYearContext } from "@/lib/calendar/hebrew-year";

export function GET() {
  return NextResponse.json(
    {
      ok: true,
      ...getHebrewYearContext(),
      refreshedAt: new Date().toISOString(),
    },
    { status: 200 },
  );
}
