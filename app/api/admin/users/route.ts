import { and, asc, eq, ilike, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { getAdminSession } from "@/lib/admin/session";
import { getUserSession } from "@/lib/auth/session";

const USER_ROLES = ["visitor", "member", "admin", "super_admin"] as const;
const roleSchema = z.enum(USER_ROLES);

function isAdminLevelRole(role: (typeof USER_ROLES)[number]) {
  return role === "admin" || role === "super_admin";
}

const updateUserPayloadSchema = z.object({
  id: z.number().int().min(1),
  role: roleSchema,
  profileVisibility: z.enum(["private", "members", "public", "anonymous"]),
});

async function requireAdmin() {
  const hasSession = await getAdminSession();
  if (!hasSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userSession = await getUserSession();
  if (!userSession) {
    return NextResponse.json(
      { error: "Admin identity required. Sign in with a user account first." },
      { status: 403 },
    );
  }

  const [actorFromDb] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userSession.userId))
    .limit(1);

  if (!actorFromDb) {
    return NextResponse.json({ error: "Admin user not found" }, { status: 403 });
  }

  const bootstrapEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  let actor = actorFromDb;
  if (bootstrapEmail && actorFromDb.email.toLowerCase() === bootstrapEmail && actorFromDb.role !== "super_admin") {
    const [upgraded] = await getDb()
      .update(users)
      .set({
        role: "super_admin",
        updatedAt: new Date(),
      })
      .where(eq(users.id, actorFromDb.id))
      .returning({
        id: users.id,
        email: users.email,
        role: users.role,
      });
    if (upgraded) {
      actor = upgraded;
    }
  }

  if (!isAdminLevelRole(actor.role)) {
    return NextResponse.json(
      { error: "Only admin or super admin user accounts can manage users." },
      { status: 403 },
    );
  }

  return actor;
}

export async function GET(request: Request) {
  const actorOrResponse = await requireAdmin();
  if (actorOrResponse instanceof NextResponse) {
    return actorOrResponse;
  }
  const actor = actorOrResponse;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const role = searchParams.get("role")?.trim() ?? "";

  const whereClause = and(
    q
      ? or(
          ilike(users.email, `%${q}%`),
          ilike(users.displayName, `%${q}%`),
        )
      : undefined,
    role && USER_ROLES.includes(role as (typeof USER_ROLES)[number])
      ? eq(users.role, role as (typeof USER_ROLES)[number])
      : undefined,
  );

  const rows = await getDb()
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      profileVisibility: users.profileVisibility,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(whereClause)
    .orderBy(asc(users.displayName));

  return NextResponse.json({
    users: rows,
    actorRole: actor.role,
    canManageAdminRoles: actor.role === "super_admin",
  });
}

export async function PUT(request: Request) {
  const actorOrResponse = await requireAdmin();
  if (actorOrResponse instanceof NextResponse) {
    return actorOrResponse;
  }
  const actor = actorOrResponse;

  const body = await request.json();
  const parsed = updateUserPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const [targetUser] = await getDb()
    .select({
      id: users.id,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, parsed.data.id))
    .limit(1);

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (actor.role !== "super_admin") {
    if (isAdminLevelRole(parsed.data.role) || isAdminLevelRole(targetUser.role)) {
      return NextResponse.json(
        { error: "Only super admins can assign or modify admin-level roles." },
        { status: 403 },
      );
    }
  }

  const [updated] = await getDb()
    .update(users)
    .set({
      role: parsed.data.role,
      profileVisibility: parsed.data.profileVisibility,
      updatedAt: new Date(),
    })
    .where(eq(users.id, parsed.data.id))
    .returning({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      profileVisibility: users.profileVisibility,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    });

  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user: updated });
}
