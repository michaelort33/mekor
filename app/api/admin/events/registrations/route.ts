import { and, desc, eq, lt, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { eventRegistrations, eventTicketTiers, events, users } from "@/db/schema";
import { requireAdminActor } from "@/lib/admin/actor";
import { featureDisabledResponse, isFeatureEnabled } from "@/lib/config/features";
import { decodeCursor, parsePageLimit, toPaginatedResult } from "@/lib/pagination/cursor";

const REGISTRATION_STATUSES = ["registered", "waitlisted", "cancelled", "payment_pending"] as const;
const registrationsCursorSchema = z.object({
  registeredAt: z.string().datetime(),
  id: z.number().int().min(1),
});

async function requireAdmin() {
  const result = await requireAdminActor();
  if ("error" in result) return result.error;
  return null;
}

export async function GET(request: Request) {
  if (!(await isFeatureEnabled("FEATURE_EVENT_SIGNUPS"))) {
    return NextResponse.json(featureDisabledResponse("FEATURE_EVENT_SIGNUPS"), { status: 404 });
  }

  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const eventId = Number(url.searchParams.get("eventId") || "0");
  const status = url.searchParams.get("status")?.trim();
  const limit = parsePageLimit(url.searchParams.get("limit"));
  const parsedCursor = decodeCursor(url.searchParams.get("cursor"), registrationsCursorSchema);
  if (parsedCursor.error) {
    return NextResponse.json({ error: parsedCursor.error }, { status: 400 });
  }
  const cursor = parsedCursor.value;

  if (status && !REGISTRATION_STATUSES.includes(status as (typeof REGISTRATION_STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
  }

  const whereClause = and(
    Number.isInteger(eventId) && eventId > 0 ? eq(eventRegistrations.eventId, eventId) : undefined,
    status ? eq(eventRegistrations.status, status as typeof eventRegistrations.$inferSelect.status) : undefined,
    cursor
      ? or(
          lt(eventRegistrations.registeredAt, new Date(cursor.registeredAt)),
          and(eq(eventRegistrations.registeredAt, new Date(cursor.registeredAt)), lt(eventRegistrations.id, cursor.id)),
        )
      : undefined,
  );

  const rows = await getDb()
    .select({
      id: eventRegistrations.id,
      eventId: eventRegistrations.eventId,
      eventTitle: events.title,
      eventPath: events.path,
      userId: eventRegistrations.userId,
      userEmail: users.email,
      userDisplayName: users.displayName,
      status: eventRegistrations.status,
      registeredAt: eventRegistrations.registeredAt,
      paymentDueAt: eventRegistrations.paymentDueAt,
      ticketTierName: eventTicketTiers.name,
      receiptUrl: eventRegistrations.receiptUrl,
      updatedAt: eventRegistrations.updatedAt,
    })
    .from(eventRegistrations)
    .innerJoin(events, eq(events.id, eventRegistrations.eventId))
    .innerJoin(users, eq(users.id, eventRegistrations.userId))
    .leftJoin(eventTicketTiers, eq(eventTicketTiers.id, eventRegistrations.ticketTierId))
    .where(whereClause)
    .orderBy(desc(eventRegistrations.registeredAt), desc(eventRegistrations.id))
    .limit(limit + 1);

  const { items, pageInfo } = toPaginatedResult(rows, limit, (row) => ({
    registeredAt: row.registeredAt.toISOString(),
    id: row.id,
  }));

  return NextResponse.json({ items, pageInfo });
}
