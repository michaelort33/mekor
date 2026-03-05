import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { getUserSession } from "@/lib/auth/session";
import { FamilyServiceError } from "@/lib/families/service";

export type FamilyUserRole = "visitor" | "member" | "admin" | "super_admin";

export type FamilyActor = {
  id: number;
  email: string;
  displayName: string;
  role: FamilyUserRole;
};

export function isMemberCapableRole(role: FamilyUserRole) {
  return role === "member" || role === "admin" || role === "super_admin";
}

export async function requireFamilyActor() {
  const session = await getUserSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }

  const [actor] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!actor) {
    return { error: NextResponse.json({ error: "User not found" }, { status: 404 }) } as const;
  }

  return { actor } as const;
}

export function familyServiceErrorResponse(error: unknown) {
  if (error instanceof FamilyServiceError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  return NextResponse.json({ error: "Unexpected family service error" }, { status: 500 });
}
