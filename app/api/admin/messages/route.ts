import { and, desc, eq, ilike, lt, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { automatedMessageLog, users } from "@/db/schema";
import { requireAdminActor } from "@/lib/admin/actor";
import { decodeCursor, parsePageLimit, toPaginatedResult } from "@/lib/pagination/cursor";

const messageLogCursorSchema = z.object({
  createdAt: z.string().datetime(),
  id: z.number().int().min(1),
});

export async function GET(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status")?.trim() ?? "";
  const limit = parsePageLimit(searchParams.get("limit"));
  const parsedCursor = decodeCursor(searchParams.get("cursor"), messageLogCursorSchema);
  if (parsedCursor.error) {
    return NextResponse.json({ error: parsedCursor.error }, { status: 400 });
  }
  const cursor = parsedCursor.value;

  const whereClause = and(
    q
      ? or(
          ilike(users.email, `%${q}%`),
          ilike(users.displayName, `%${q}%`),
          ilike(automatedMessageLog.subject, `%${q}%`),
        )
      : undefined,
    status === "sent" || status === "failed"
      ? eq(automatedMessageLog.deliveryStatus, status)
      : undefined,
    cursor
      ? or(
          lt(automatedMessageLog.createdAt, new Date(cursor.createdAt)),
          and(
            eq(automatedMessageLog.createdAt, new Date(cursor.createdAt)),
            lt(automatedMessageLog.id, cursor.id),
          ),
        )
      : undefined,
  );

  const rows = await getDb()
    .select({
      id: automatedMessageLog.id,
      userId: automatedMessageLog.userId,
      userEmail: users.email,
      userDisplayName: users.displayName,
      messageType: automatedMessageLog.messageType,
      membershipRenewalDate: automatedMessageLog.membershipRenewalDate,
      recipientEmail: automatedMessageLog.recipientEmail,
      subject: automatedMessageLog.subject,
      provider: automatedMessageLog.provider,
      providerMessageId: automatedMessageLog.providerMessageId,
      deliveryStatus: automatedMessageLog.deliveryStatus,
      errorMessage: automatedMessageLog.errorMessage,
      sentAt: automatedMessageLog.sentAt,
      createdAt: automatedMessageLog.createdAt,
    })
    .from(automatedMessageLog)
    .innerJoin(users, eq(users.id, automatedMessageLog.userId))
    .where(whereClause)
    .orderBy(desc(automatedMessageLog.createdAt), desc(automatedMessageLog.id))
    .limit(limit + 1);

  const { items, pageInfo } = toPaginatedResult(rows, limit, (row) => ({
    createdAt: row.createdAt.toISOString(),
    id: row.id,
  }));

  return NextResponse.json({ items, pageInfo });
}
