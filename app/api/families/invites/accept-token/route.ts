import { NextResponse } from "next/server";
import { z } from "zod";

import { familyServiceErrorResponse, requireFamilyActor } from "@/lib/families/http";
import { acceptFamilyInviteByToken } from "@/lib/families/service";
import { allowWithinWindow } from "@/lib/invitations/rate-limit";

const acceptInviteTokenSchema = z.object({
  token: z.string().trim().min(24).max(2048),
});

export async function POST(request: Request) {
  const actorResult = await requireFamilyActor();
  if ("error" in actorResult) return actorResult.error;
  const actor = actorResult.actor;

  const parsed = acceptInviteTokenSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateLimitKey = `family-invite-accept-token:${actor.id}:${ip}`;
  if (!allowWithinWindow(rateLimitKey, 10, 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Please wait and retry." }, { status: 429 });
  }

  try {
    const result = await acceptFamilyInviteByToken({
      actorUserId: actor.id,
      token: parsed.data.token,
      actorEmail: actor.email,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return familyServiceErrorResponse(error);
  }
}
