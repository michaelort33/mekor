import { NextResponse } from "next/server";

import { getUserSession } from "@/lib/auth/session";
import { memberEventsServiceErrorResponse } from "@/lib/member-events/http";
import { cancelMemberEvent } from "@/lib/member-events/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseEventId(raw: string) {
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 1) return null;
  return value;
}

export async function POST(_: Request, context: RouteContext) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const eventId = parseEventId((await context.params).id);
  if (!eventId) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  try {
    const event = await cancelMemberEvent({
      actorUserId: session.userId,
      eventId,
    });
    return NextResponse.json({ event });
  } catch (error) {
    return memberEventsServiceErrorResponse(error);
  }
}
