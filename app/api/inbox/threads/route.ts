import { NextResponse } from "next/server";
import { z } from "zod";

import { familyServiceErrorResponse, requireFamilyActor } from "@/lib/families/http";
import { listInboxThreads } from "@/lib/families/service";
import { startOrGetDirectThread } from "@/lib/inbox/direct";

const createDirectThreadSchema = z.object({
  recipientUserId: z.number().int().min(1),
  body: z.string().trim().max(4000).optional(),
});

export async function GET() {
  const actorResult = await requireFamilyActor();
  if ("error" in actorResult) return actorResult.error;

  try {
    const items = await listInboxThreads(actorResult.actor.id);
    return NextResponse.json({ items });
  } catch (error) {
    return familyServiceErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const actorResult = await requireFamilyActor();
  if ("error" in actorResult) return actorResult.error;

  const parsed = createDirectThreadSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await startOrGetDirectThread({
      actorUserId: actorResult.actor.id,
      recipientUserId: parsed.data.recipientUserId,
      body: parsed.data.body,
    });
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    return familyServiceErrorResponse(error);
  }
}
