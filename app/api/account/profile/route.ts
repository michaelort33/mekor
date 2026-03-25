import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { canAccessMembersArea, requireAuthenticatedAccountAccess } from "@/lib/auth/account-access";
import { getDb } from "@/db/client";
import { people, users } from "@/db/schema";
import { profileUpdatePayloadSchema } from "@/lib/users/validation";

export async function GET() {
  const access = await requireAuthenticatedAccountAccess();
  if ("error" in access) {
    return access.error;
  }

  const db = getDb();
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
    .where(eq(users.id, access.session.userId))
    .limit(1);

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [person] = await db
    .select({
      firstName: people.firstName,
      lastName: people.lastName,
      phone: people.phone,
      city: people.city,
    })
    .from(people)
    .where(eq(people.userId, access.session.userId))
    .limit(1);

  const nameParts = profile.displayName.trim().split(/\s+/).filter(Boolean);
  const firstName = person?.firstName || nameParts[0] || "";
  const lastName = person?.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(" ") : "");

  return NextResponse.json({
    profile: {
      ...profile,
      firstName,
      lastName,
      phone: person?.phone || "",
      city: person?.city || profile.city,
      accessState: access.accessState,
      canAccessMembersArea: canAccessMembersArea(access),
      latestMembershipApplicationStatus: access.latestMembershipApplicationStatus,
    },
  });
}

export async function PUT(request: Request) {
  const access = await requireAuthenticatedAccountAccess();
  if ("error" in access) {
    return access.error;
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
    .where(eq(users.id, access.session.userId))
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

  return NextResponse.json({
    profile: {
      ...updated,
      accessState: access.accessState,
      canAccessMembersArea: canAccessMembersArea(access),
      latestMembershipApplicationStatus: access.latestMembershipApplicationStatus,
    },
  });
}
