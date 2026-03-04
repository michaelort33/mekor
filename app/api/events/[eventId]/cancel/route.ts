import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { eventRegistrations } from "@/db/schema";
import { getUserSession } from "@/lib/auth/session";
import { featureDisabledResponse, isFeatureEnabled } from "@/lib/config/features";
import { promoteWaitlistForEvent } from "@/lib/events/waitlist";

type Params = {
  params: Promise<{ eventId: string }>;
};

export async function POST(_: Request, { params }: Params) {
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

  const db = getDb();
  const [registration] = await db
    .select({
      id: eventRegistrations.id,
      status: eventRegistrations.status,
    })
    .from(eventRegistrations)
    .where(
      and(
        eq(eventRegistrations.eventId, numericEventId),
        eq(eventRegistrations.userId, session.userId),
        inArray(eventRegistrations.status, ["registered", "waitlisted", "payment_pending"]),
      ),
    )
    .limit(1);

  if (!registration) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  await db
    .update(eventRegistrations)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(eventRegistrations.id, registration.id));

  let promotedRegistrationId: number | null = null;

  if (registration.status === "registered" || registration.status === "payment_pending") {
    const promoted = await promoteWaitlistForEvent(numericEventId);
    promotedRegistrationId = promoted?.registrationId ?? null;
  }

  return NextResponse.json({ ok: true, promotedRegistrationId });
}
