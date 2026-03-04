import { and, eq, gte, lt } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { eventRegistrations, eventReminderLog, events, users } from "@/db/schema";
import { featureDisabledResponse, isFeatureEnabled } from "@/lib/config/features";
import { sendEventReminderEmail } from "@/lib/events/email";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return true;
  }

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!(await isFeatureEnabled("FEATURE_EVENT_SIGNUPS"))) {
    return NextResponse.json(featureDisabledResponse("FEATURE_EVENT_SIGNUPS"), { status: 404 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const rows = await getDb()
    .select({
      registrationId: eventRegistrations.id,
      userEmail: users.email,
      userDisplayName: users.displayName,
      eventTitle: events.title,
      eventPath: events.path,
    })
    .from(eventRegistrations)
    .innerJoin(events, eq(events.id, eventRegistrations.eventId))
    .innerJoin(users, eq(users.id, eventRegistrations.userId))
    .where(
      and(
        eq(eventRegistrations.status, "registered"),
        gte(events.startAt, now),
        lt(events.startAt, in24h),
      ),
    );

  let sent = 0;

  for (const row of rows) {
    const [existing] = await getDb()
      .select({ id: eventReminderLog.id })
      .from(eventReminderLog)
      .where(and(eq(eventReminderLog.registrationId, row.registrationId), eq(eventReminderLog.reminderType, "event_24h")))
      .limit(1);

    if (existing) {
      continue;
    }

    await sendEventReminderEmail({
      toEmail: row.userEmail,
      displayName: row.userDisplayName,
      eventTitle: row.eventTitle,
      eventPath: row.eventPath,
    });

    await getDb().insert(eventReminderLog).values({
      registrationId: row.registrationId,
      reminderType: "event_24h",
      updatedAt: new Date(),
    });

    sent += 1;
  }

  return NextResponse.json({ ok: true, sent });
}
