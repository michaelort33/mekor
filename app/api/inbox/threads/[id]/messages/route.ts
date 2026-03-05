import { NextResponse } from "next/server";
import { z } from "zod";

import { familyServiceErrorResponse, requireFamilyActor } from "@/lib/families/http";
import { createInboxMessage, getInboxThreadMessages } from "@/lib/families/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const messageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

function parseThreadId(rawId: string) {
  const threadId = Number.parseInt(rawId, 10);
  if (!Number.isInteger(threadId) || threadId < 1) {
    return null;
  }
  return threadId;
}

export async function GET(_: Request, context: RouteContext) {
  const actorResult = await requireFamilyActor();
  if ("error" in actorResult) return actorResult.error;

  const threadId = parseThreadId((await context.params).id);
  if (!threadId) {
    return NextResponse.json({ error: "Invalid thread id" }, { status: 400 });
  }

  try {
    const result = await getInboxThreadMessages({
      actorUserId: actorResult.actor.id,
      threadId,
    });
    return NextResponse.json(result);
  } catch (error) {
    return familyServiceErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const actorResult = await requireFamilyActor();
  if ("error" in actorResult) return actorResult.error;

  const threadId = parseThreadId((await context.params).id);
  if (!threadId) {
    return NextResponse.json({ error: "Invalid thread id" }, { status: 400 });
  }

  const parsed = messageSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const message = await createInboxMessage({
      actorUserId: actorResult.actor.id,
      threadId,
      body: parsed.data.body,
    });
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return familyServiceErrorResponse(error);
  }
}
