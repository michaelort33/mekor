import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { eventOrganizerMessages, eventSignupSettings, events, users } from "@/db/schema";
import { getUserSession } from "@/lib/auth/session";
import { featureDisabledResponse, isFeatureEnabled } from "@/lib/config/features";
import { sendEventOrganizerMessage } from "@/lib/events/email";

type Params = {
  params: Promise<{ eventId: string }>;
};

const payloadSchema = z.object({
  subject: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(5000),
});

export async function POST(request: Request, { params }: Params) {
  if (!(await isFeatureEnabled("FEATURE_EVENT_SIGNUPS"))) {
    return NextResponse.json(featureDisabledResponse("FEATURE_EVENT_SIGNUPS"), { status: 404 });
  }

  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await params;
  const numericEventId = Number(eventId);
  if (!Number.isInteger(numericEventId) || numericEventId < 1) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const [eventRow] = await db
    .select({
      id: events.id,
      title: events.title,
    })
    .from(events)
    .where(eq(events.id, numericEventId))
    .limit(1);

  if (!eventRow) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const [settings] = await db
    .select({
      organizerEmail: eventSignupSettings.organizerEmail,
    })
    .from(eventSignupSettings)
    .where(and(eq(eventSignupSettings.eventId, numericEventId), eq(eventSignupSettings.enabled, true)))
    .limit(1);

  const [sender] = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!sender) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await db.insert(eventOrganizerMessages).values({
    eventId: numericEventId,
    userId: sender.id,
    subject: parsed.data.subject,
    message: parsed.data.message,
    updatedAt: new Date(),
  });

  await sendEventOrganizerMessage({
    organizerEmail: settings?.organizerEmail || "",
    eventTitle: eventRow.title,
    senderName: sender.displayName,
    senderEmail: sender.email,
    subject: parsed.data.subject,
    message: parsed.data.message,
  });

  return NextResponse.json({ ok: true });
}
