import { NextResponse } from "next/server";

import { familyServiceErrorResponse, requireFamilyActor } from "@/lib/families/http";
import { revokeFamilyInvite } from "@/lib/families/service";
import { allowWithinWindow } from "@/lib/invitations/rate-limit";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const actorResult = await requireFamilyActor();
  if ("error" in actorResult) return actorResult.error;
  const actor = actorResult.actor;

  const inviteId = Number.parseInt((await context.params).id, 10);
  if (!Number.isInteger(inviteId) || inviteId < 1) {
    return NextResponse.json({ error: "Invalid invite id" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateLimitKey = `family-invite-revoke:${inviteId}:${actor.id}:${ip}`;
  if (!allowWithinWindow(rateLimitKey, 20, 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Please wait and retry." }, { status: 429 });
  }

  try {
    const result = await revokeFamilyInvite({
      actorUserId: actor.id,
      inviteId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return familyServiceErrorResponse(error);
  }
}
