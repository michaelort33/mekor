import { NextResponse } from "next/server";

import { approveMemberEventRequest, MemberEventServiceError } from "@/lib/member-events/service";
import { getUserSession } from "@/lib/auth/session";

type RouteContext = {
  params: Promise<{ id: string; requestId: string }>;
};

function parseId(raw: string) {
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 1) return null;
  return value;
}

function serviceErrorResponse(error: unknown) {
  if (error instanceof MemberEventServiceError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  return NextResponse.json({ error: "Unexpected member event error" }, { status: 500 });
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
    const attendee = await approveMemberEventRequest({
      actorUserId: session.userId,
      eventId,
      requestId: attendeeId,
    });
    return NextResponse.json({ attendee });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}
