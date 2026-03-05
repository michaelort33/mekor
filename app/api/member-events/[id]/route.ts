import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserSession } from "@/lib/auth/session";
import { memberEventsServiceErrorResponse } from "@/lib/member-events/http";
import { getMemberEventDetail, updateMemberEvent } from "@/lib/member-events/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const updateMemberEventSchema = z
  .object({
    title: z.string().trim().min(3).max(160).optional(),
    description: z.string().trim().max(4000).optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional().nullable(),
    location: z.string().trim().max(255).optional(),
    capacity: z.number().int().min(1).max(2000).optional().nullable(),
    joinMode: z.enum(["open_join", "request_to_join"]).optional(),
    visibility: z.enum(["members_only", "public"]).optional(),
    status: z.enum(["draft", "published", "cancelled", "completed"]).optional(),
  })
  .refine((value) => {
    if (!value.startsAt || !value.endsAt) return true;
    return new Date(value.endsAt).getTime() > new Date(value.startsAt).getTime();
  }, "Event end time must be after start time");

function parseEventId(raw: string) {
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 1) return null;
  return value;
}

export async function GET(_: Request, context: RouteContext) {
  const eventId = parseEventId((await context.params).id);
  if (!eventId) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  const session = await getUserSession();
  try {
    const detail = await getMemberEventDetail({
      eventId,
      viewerUserId: session?.userId,
    });
    return NextResponse.json(detail);
  } catch (error) {
    return memberEventsServiceErrorResponse(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const eventId = parseEventId((await context.params).id);
  if (!eventId) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = updateMemberEventSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const updated = await updateMemberEvent({
      actorUserId: session.userId,
      eventId,
      title: parsed.data.title,
      description: parsed.data.description,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : undefined,
      endsAt: parsed.data.endsAt === undefined ? undefined : parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      location: parsed.data.location,
      capacity: parsed.data.capacity,
      joinMode: parsed.data.joinMode,
      visibility: parsed.data.visibility,
      status: parsed.data.status,
    });
    return NextResponse.json({ event: updated });
  } catch (error) {
    return memberEventsServiceErrorResponse(error);
  }
}
