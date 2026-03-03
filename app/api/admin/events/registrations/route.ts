import { and, asc, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { eventRegistrations, eventTicketTiers, events, users } from "@/db/schema";
import { getAdminSession } from "@/lib/admin/session";
import { featureDisabledResponse, isFeatureEnabled } from "@/lib/config/features";

const REGISTRATION_STATUSES = ["registered", "waitlisted", "cancelled", "payment_pending"] as const;

async function requireAdmin() {
  const hasSession = await getAdminSession();
  if (!hasSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

export async function GET(request: Request) {
  if (!isFeatureEnabled("FEATURE_EVENT_SIGNUPS")) {
    return NextResponse.json(featureDisabledResponse("FEATURE_EVENT_SIGNUPS"), { status: 404 });
  }

  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const eventId = Number(url.searchParams.get("eventId") || "0");
  const status = url.searchParams.get("status")?.trim();
  if (status && !REGISTRATION_STATUSES.includes(status as (typeof REGISTRATION_STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
  }

  const whereClause = and(
    Number.isInteger(eventId) && eventId > 0 ? eq(eventRegistrations.eventId, eventId) : undefined,
    status ? eq(eventRegistrations.status, status as typeof eventRegistrations.$inferSelect.status) : undefined,
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
    .orderBy(desc(eventRegistrations.registeredAt), asc(events.title));

  return NextResponse.json({ registrations: rows });
}
