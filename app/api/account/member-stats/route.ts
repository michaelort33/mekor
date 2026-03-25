import { NextResponse } from "next/server";

import { canAccessMembersArea, requireAuthenticatedAccountAccess } from "@/lib/auth/account-access";
import { getMemberHostStats } from "@/lib/member-events/service";

export async function GET() {
  const access = await requireAuthenticatedAccountAccess();
  if ("error" in access) {
    return access.error;
  }

  if (!canAccessMembersArea(access)) {
    return NextResponse.json({
      stats: {
        eventsHostedCount: 0,
        approvedAttendeesTotal: 0,
        uniqueAttendeesCount: 0,
        upcomingHostedCount: 0,
        attendanceRate: 0,
      },
    });
  }

  const stats = await getMemberHostStats({
    userId: access.session.userId,
  });

  return NextResponse.json({ stats });
}
