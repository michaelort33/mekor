import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { eventRsvps, events } from "@/db/schema";
import { eventRsvpInputSchema } from "@/lib/member-ops/contracts";
import { isMemberOpsEnabled } from "@/lib/member-ops/feature";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  if (!isMemberOpsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { slug } = await context.params;
  const body = await request.json();
  const parsed = eventRsvpInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const [event] = await db
    .select({ path: events.path, title: events.title, slug: events.slug })
    .from(events)
    .where(eq(events.slug, slug))
    .limit(1);

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const [created] = await db
    .insert(eventRsvps)
    .values({
      eventPath: event.path,
      eventSlug: event.slug,
      eventTitle: event.title,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      attendeeCount: parsed.data.attendeeCount,
      note: parsed.data.note,
      sourcePath: parsed.data.sourcePath,
    })
    .returning({
      id: eventRsvps.id,
      createdAt: eventRsvps.createdAt,
    });

  return NextResponse.json({ ok: true, rsvp: created }, { status: 201 });
}
