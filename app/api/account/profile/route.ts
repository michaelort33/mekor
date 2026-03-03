import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { getUserSession } from "@/lib/auth/session";
import { profileUpdatePayloadSchema } from "@/lib/users/validation";

async function requireUserSession() {
  const session = await getUserSession();
  if (!session) {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireUserSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profile] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      bio: users.bio,
      city: users.city,
      avatarUrl: users.avatarUrl,
      profileVisibility: users.profileVisibility,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const session = await requireUserSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = profileUpdatePayloadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const [updated] = await getDb()
    .update(users)
    .set({
      displayName: parsed.data.displayName.trim(),
      bio: parsed.data.bio.trim(),
      city: parsed.data.city.trim(),
      avatarUrl: parsed.data.avatarUrl.trim(),
      profileVisibility: parsed.data.profileVisibility,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.userId))
    .returning({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      bio: users.bio,
      city: users.city,
      avatarUrl: users.avatarUrl,
      profileVisibility: users.profileVisibility,
      role: users.role,
    });

  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ profile: updated });
}
