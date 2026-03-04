import { and, eq, lt } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { eventRegistrations, events, users } from "@/db/schema";
import { featureDisabledResponse, isFeatureEnabled } from "@/lib/config/features";
import { sendEventPaymentWindowExpiredEmail } from "@/lib/events/email";
import { promoteWaitlistForEvent } from "@/lib/events/waitlist";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!(await isFeatureEnabled("FEATURE_EVENT_SIGNUPS"))) {
    return NextResponse.json(featureDisabledResponse("FEATURE_EVENT_SIGNUPS"), { status: 404 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const now = new Date();

  const staleRows = await db
    .select({
      id: eventRegistrations.id,
      eventId: eventRegistrations.eventId,
      userId: eventRegistrations.userId,
      eventPath: events.path,
      eventTitle: events.title,
      userEmail: users.email,
      userDisplayName: users.displayName,
    })
    .from(eventRegistrations)
    .innerJoin(events, eq(events.id, eventRegistrations.eventId))
    .innerJoin(users, eq(users.id, eventRegistrations.userId))
    .where(and(eq(eventRegistrations.status, "payment_pending"), lt(eventRegistrations.paymentDueAt, now)));

  let cancelled = 0;
  let promoted = 0;
  const promotionQueue: number[] = [];

  for (const row of staleRows) {
    const [updated] = await db
      .update(eventRegistrations)
      .set({
        status: "cancelled",
        updatedAt: now,
      })
      .where(and(eq(eventRegistrations.id, row.id), eq(eventRegistrations.status, "payment_pending")))
      .returning({
        id: eventRegistrations.id,
      });

    if (!updated) {
      continue;
    }

    cancelled += 1;
    promotionQueue.push(row.eventId);

    await sendEventPaymentWindowExpiredEmail({
      toEmail: row.userEmail,
      displayName: row.userDisplayName,
      eventTitle: row.eventTitle,
      eventPath: row.eventPath,
    });
  }

  for (const eventId of promotionQueue) {
    const promotedRow = await promoteWaitlistForEvent(eventId);
    if (promotedRow) {
      promoted += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    cancelled,
    promoted,
  });
}
