import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { adminAuditLog, users } from "@/db/schema";
import { requireAdminActor } from "@/lib/admin/actor";

const querySchema = z.object({
  templateId: z.string().trim().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().trim().regex(/^\d+$/).transform(Number).optional(),
});

export async function GET(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    templateId: searchParams.get("templateId") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", issues: parsed.error.flatten() }, { status: 400 });
  }

  const limit = Math.max(1, Math.min(parsed.data.limit ?? 40, 120));
  const whereClause = and(
    eq(adminAuditLog.targetType, "newsletter_template"),
    parsed.data.templateId ? eq(adminAuditLog.targetId, String(parsed.data.templateId)) : undefined,
  );

  const items = await getDb()
    .select({
      id: adminAuditLog.id,
      actorUserId: adminAuditLog.actorUserId,
      actorDisplayName: users.displayName,
      actorEmail: users.email,
      action: adminAuditLog.action,
      targetId: adminAuditLog.targetId,
      payloadJson: adminAuditLog.payloadJson,
      createdAt: adminAuditLog.createdAt,
    })
    .from(adminAuditLog)
    .innerJoin(users, eq(users.id, adminAuditLog.actorUserId))
    .where(whereClause)
    .orderBy(desc(adminAuditLog.createdAt), desc(adminAuditLog.id))
    .limit(limit);

  return NextResponse.json({ items });
}
