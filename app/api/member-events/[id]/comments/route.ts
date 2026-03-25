import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApprovedMemberAccountAccess } from "@/lib/auth/account-access";
import { memberEventsServiceErrorResponse } from "@/lib/member-events/http";
import { createMemberEventComment, getMemberEventDetail } from "@/lib/member-events/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(800),
});

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
  const access = await requireApprovedMemberAccountAccess();
  if ("error" in access) {
    return access.error;
  }
  try {
    const detail = await getMemberEventDetail({
      eventId,
      viewerUserId: access.session.userId,
    });
    return NextResponse.json({ comments: detail.comments });
  } catch (error) {
    return memberEventsServiceErrorResponse(error);
  }
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

  const parsed = createCommentSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const comment = await createMemberEventComment({
      actorUserId: access.session.userId,
      eventId,
      body: parsed.data.body,
    });
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return memberEventsServiceErrorResponse(error);
  }
}
