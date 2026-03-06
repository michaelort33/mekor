import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { getUserSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, role: null });
  }

  const [user] = await getDb()
    .select({
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  return NextResponse.json({
    authenticated: Boolean(user),
    role: user?.role ?? null,
  });
}
