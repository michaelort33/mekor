import { NextResponse } from "next/server";

import { isMemberOpsEnabled } from "@/lib/member-ops/feature";
import { getVolunteerSlots } from "@/lib/member-ops/volunteer";

export async function GET() {
  if (!isMemberOpsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const slots = await getVolunteerSlots();
  return NextResponse.json({ slots }, { status: 200 });
}
