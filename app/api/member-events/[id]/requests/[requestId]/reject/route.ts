import { NextResponse } from "next/server";

import { getUserSession } from "@/lib/auth/session";
import { memberEventsServiceErrorResponse } from "@/lib/member-events/http";
import { rejectMemberEventRequest } from "@/lib/member-events/service";

type RouteContext = {
  params: Promise<{ id: string; requestId: string }>;
};

function parseId(raw: string) {
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 1) return null;
  return value;
}

export async function POST(_: Request, context: RouteContext) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, requestId } = await context.params;
  const eventId = parseId(id);
  const attendeeId = parseId(requestId);
  if (!eventId || !attendeeId) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  try {
    const attendee = await rejectMemberEventRequest({
      actorUserId: session.userId,
      eventId,
      requestId: attendeeId,
    });
    return NextResponse.json({ attendee });
  } catch (error) {
    return memberEventsServiceErrorResponse(error);
  }
}
