import { NextResponse } from "next/server";

import { ensureAdminApiSession } from "@/lib/admin/guard";
import { isMemberOpsEnabled } from "@/lib/member-ops/feature";
import { getDashboardSummary } from "@/lib/member-ops/dashboard";

export async function GET() {
  if (!isMemberOpsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const auth = await ensureAdminApiSession();
  if (auth) {
    return auth;
  }

  const summary = await getDashboardSummary();
  return NextResponse.json({ summary }, { status: 200 });
}
