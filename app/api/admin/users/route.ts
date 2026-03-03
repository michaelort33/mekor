import { and, asc, eq, ilike, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { getAdminSession } from "@/lib/admin/session";

const USER_ROLES = ["visitor", "member", "admin"] as const;
const roleSchema = z.enum(USER_ROLES);

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

  return null;
}

export async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

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

  return NextResponse.json({ users: rows });
}

export async function PUT(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

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
