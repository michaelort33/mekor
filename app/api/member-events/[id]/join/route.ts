import { NextResponse } from "next/server";

import { requireApprovedMemberAccountAccess } from "@/lib/auth/account-access";
import { memberEventsServiceErrorResponse } from "@/lib/member-events/http";
import { joinMemberEvent } from "@/lib/member-events/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseEventId(raw: string) {
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 1) return null;
  return value;
}

export async function POST(request: Request, context: RouteContext) {
  const access = await requireApprovedMemberAccountAccess();
  if ("error" in access) {
    return access.error;
  }

  const eventId = parseEventId((await context.params).id);
  if (!eventId) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  try {
    const result = await joinMemberEvent({
      actorUserId: access.session.userId,
      eventId,
      ipAddress: ip,
    });
    return NextResponse.json(result);
  } catch (error) {
    return memberEventsServiceErrorResponse(error);
  }
}
