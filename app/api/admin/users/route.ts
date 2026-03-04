import { and, desc, eq, ilike, inArray, lt, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { duesInvoices, stripeCustomers, users } from "@/db/schema";
import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import { decodeCursor, parsePageLimit, toPaginatedResult } from "@/lib/pagination/cursor";

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

const usersCursorSchema = z.object({
  createdAt: z.string().datetime(),
  id: z.number().int().min(1),
});

export async function GET(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;
  const actor = adminResult.actor;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const role = searchParams.get("role")?.trim() ?? "";
  const limit = parsePageLimit(searchParams.get("limit"));
  const parsedCursor = decodeCursor(searchParams.get("cursor"), usersCursorSchema);
  if (parsedCursor.error) {
    return NextResponse.json({ error: parsedCursor.error }, { status: 400 });
  }
  const cursor = parsedCursor.value;

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
    cursor
      ? or(
          lt(users.createdAt, new Date(cursor.createdAt)),
          and(eq(users.createdAt, new Date(cursor.createdAt)), lt(users.id, cursor.id)),
        )
      : undefined,
  );

  const rows = await getDb()
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      profileVisibility: users.profileVisibility,
      stripeCustomerId: stripeCustomers.stripeCustomerId,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .leftJoin(stripeCustomers, eq(stripeCustomers.userId, users.id))
    .where(whereClause)
    .orderBy(desc(users.createdAt), desc(users.id))
    .limit(limit + 1);

  const { items: pageRows, pageInfo } = toPaginatedResult(
    rows,
    limit,
    (row) => ({
      createdAt: row.createdAt.toISOString(),
      id: row.id,
    }),
  );

  const userIds = pageRows.map((row) => row.id);
  const outstandingRows =
    userIds.length === 0
      ? []
      : await getDb()
          .select({
            userId: duesInvoices.userId,
            outstandingBalanceCents: sql<number>`COALESCE(SUM(${duesInvoices.amountCents}), 0)`,
          })
          .from(duesInvoices)
          .where(and(inArray(duesInvoices.userId, userIds), inArray(duesInvoices.status, ["open", "overdue"])))
          .groupBy(duesInvoices.userId);

  const outstandingByUserId = new Map(outstandingRows.map((row) => [row.userId, Number(row.outstandingBalanceCents)]));
  const usersWithFinance = pageRows.map((row) => ({
    ...row,
    outstandingBalanceCents: outstandingByUserId.get(row.id) ?? 0,
  }));

  return NextResponse.json({
    items: usersWithFinance,
    pageInfo,
    actorRole: actor.role,
    canManageAdminRoles: actor.role === "super_admin",
  });
}

export async function PUT(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;
  const actor = adminResult.actor;

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

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "user.role_visibility.updated",
    targetType: "user",
    targetId: String(updated.id),
    payload: {
      role: updated.role,
      profileVisibility: updated.profileVisibility,
    },
  });

  return NextResponse.json({ user: updated });
}
