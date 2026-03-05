import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserSession } from "@/lib/auth/session";
import { createMemberEventComment, getMemberEventDetail, MemberEventServiceError } from "@/lib/member-events/service";

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

function serviceErrorResponse(error: unknown) {
  if (error instanceof MemberEventServiceError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  return NextResponse.json({ error: "Unexpected member event error" }, { status: 500 });
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
    return NextResponse.json({ comments: detail.comments });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      actorUserId: session.userId,
      eventId,
      body: parsed.data.body,
    });
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}
