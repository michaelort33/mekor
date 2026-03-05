import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { eventRegistrations, events, users } from "@/db/schema";
import { getUserSession } from "@/lib/auth/session";
import { featureDisabledResponse, isFeatureEnabled } from "@/lib/config/features";
import { eventSignupErrorResponse } from "@/lib/events/http";
import { isAnonymousVisibility } from "@/lib/users/visibility";

type Params = {
  params: Promise<{ eventId: string }>;
};

const FEED_ACTIVE_STATUSES = ["registered", "waitlisted", "payment_pending"] as const;

const updateSchema = z.object({
  shareInFeed: z.boolean(),
  signupComment: z.string().trim().max(280).default(""),
});

function parseEventId(eventId: string) {
  const numericEventId = Number(eventId);
  if (!Number.isInteger(numericEventId) || numericEventId < 1) {
    return null;
  }
  return numericEventId;
}

export async function GET(request: Request, { params }: Params) {
  try {
    if (!(await isFeatureEnabled("FEATURE_EVENT_SIGNUPS"))) {
      return NextResponse.json(featureDisabledResponse("FEATURE_EVENT_SIGNUPS"), { status: 404 });
    }

    const { eventId } = await params;
    const numericEventId = parseEventId(eventId);
    if (!numericEventId) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    const url = new URL(request.url);
    const rawLimit = Number(url.searchParams.get("limit") || "24");
    const limit = Number.isInteger(rawLimit) ? Math.max(1, Math.min(rawLimit, 60)) : 24;

    const db = getDb();
    const [eventRow] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, numericEventId))
      .limit(1);
    if (!eventRow) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const rows = await db
      .select({
        id: eventRegistrations.id,
        status: eventRegistrations.status,
        signupComment: eventRegistrations.signupComment,
        registeredAt: eventRegistrations.registeredAt,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        role: users.role,
        profileVisibility: users.profileVisibility,
      })
      .from(eventRegistrations)
      .innerJoin(users, eq(users.id, eventRegistrations.userId))
      .where(
        and(
          eq(eventRegistrations.eventId, numericEventId),
          eq(eventRegistrations.shareInFeed, true),
          inArray(eventRegistrations.status, FEED_ACTIVE_STATUSES),
          inArray(users.role, ["member", "admin", "super_admin"]),
        ),
      )
      .orderBy(desc(eventRegistrations.registeredAt), desc(eventRegistrations.id))
      .limit(limit);

    return NextResponse.json({
      items: rows.map((row) => ({
        id: row.id,
        status: row.status,
        signupComment: row.signupComment,
        registeredAt: row.registeredAt,
        role: isAnonymousVisibility(row.profileVisibility) ? null : row.role,
        displayName: isAnonymousVisibility(row.profileVisibility) ? "Community Member" : row.displayName,
        avatarUrl: isAnonymousVisibility(row.profileVisibility) ? "" : row.avatarUrl,
        anonymous: isAnonymousVisibility(row.profileVisibility),
      })),
    });
  } catch (error) {
    return eventSignupErrorResponse(error);
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    if (!(await isFeatureEnabled("FEATURE_EVENT_SIGNUPS"))) {
      return NextResponse.json(featureDisabledResponse("FEATURE_EVENT_SIGNUPS"), { status: 404 });
    }

    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;
    const numericEventId = parseEventId(eventId);
    if (!numericEventId) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
    }

    const [registration] = await getDb()
      .update(eventRegistrations)
      .set({
        shareInFeed: parsed.data.shareInFeed,
        signupComment: parsed.data.signupComment,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(eventRegistrations.eventId, numericEventId),
          eq(eventRegistrations.userId, session.userId),
          inArray(eventRegistrations.status, FEED_ACTIVE_STATUSES),
        ),
      )
      .returning({
        id: eventRegistrations.id,
        status: eventRegistrations.status,
        shareInFeed: eventRegistrations.shareInFeed,
        signupComment: eventRegistrations.signupComment,
      });

    if (!registration) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    return NextResponse.json({ registration });
  } catch (error) {
    return eventSignupErrorResponse(error);
  }
}
