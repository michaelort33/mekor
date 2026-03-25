import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { canAccessMembersArea, getSessionAccountAccess } from "@/lib/auth/account-access";

export async function GET() {
  const access = await getSessionAccountAccess();
  if (!access) {
    return NextResponse.json({
      authenticated: false,
      role: null,
      accessState: null,
      canAccessMembersArea: false,
      latestMembershipApplicationStatus: null,
    });
  }

  const [user] = await getDb()
    .select({
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, access.session.userId))
    .limit(1);

  return NextResponse.json({
    authenticated: Boolean(user),
    role: user?.role ?? null,
    accessState: access.accessState,
    canAccessMembersArea: Boolean(user) && canAccessMembersArea(access),
    latestMembershipApplicationStatus: access.latestMembershipApplicationStatus,
  });
}
