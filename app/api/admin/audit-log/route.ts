import { and, desc, eq, ilike, lt, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { adminAuditLog, users } from "@/db/schema";
import { requireAdminActor } from "@/lib/admin/actor";
import { decodeCursor, parsePageLimit, toPaginatedResult } from "@/lib/pagination/cursor";

export const dynamic = "force-dynamic";

const cursorSchema = z.object({
  createdAt: z.string().datetime(),
  id: z.number().int().min(1),
});

export async function GET(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action")?.trim() ?? "";
  const targetType = searchParams.get("targetType")?.trim() ?? "";
  const actorEmail = searchParams.get("actorEmail")?.trim() ?? "";
  const limit = parsePageLimit(searchParams.get("limit"));
  const parsedCursor = decodeCursor(searchParams.get("cursor"), cursorSchema);
  if (parsedCursor.error) return NextResponse.json({ error: parsedCursor.error }, { status: 400 });
  const cursor = parsedCursor.value;

  const whereClause = and(
    action ? ilike(adminAuditLog.action, `%${action}%`) : undefined,
    targetType ? eq(adminAuditLog.targetType, targetType) : undefined,
    actorEmail ? ilike(users.email, `%${actorEmail}%`) : undefined,
    cursor
      ? or(
          lt(adminAuditLog.createdAt, new Date(cursor.createdAt)),
          and(eq(adminAuditLog.createdAt, new Date(cursor.createdAt)), lt(adminAuditLog.id, cursor.id)),
        )
      : undefined,
  );

  const rows = await getDb()
    .select({
      id: adminAuditLog.id,
      actorUserId: adminAuditLog.actorUserId,
      actorEmail: users.email,
      actorDisplayName: users.displayName,
      action: adminAuditLog.action,
      targetType: adminAuditLog.targetType,
      targetId: adminAuditLog.targetId,
      payloadJson: adminAuditLog.payloadJson,
      createdAt: adminAuditLog.createdAt,
    })
    .from(adminAuditLog)
    .innerJoin(users, eq(users.id, adminAuditLog.actorUserId))
    .where(whereClause)
    .orderBy(desc(adminAuditLog.createdAt), desc(adminAuditLog.id))
    .limit(limit + 1);

  const { items, pageInfo } = toPaginatedResult(rows, limit, (row) => ({
    createdAt: row.createdAt.toISOString(),
    id: row.id,
  }));

  return NextResponse.json({ items, pageInfo });
}
