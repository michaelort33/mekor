import { NextResponse } from "next/server";
import { z } from "zod";

import { familyServiceErrorResponse, requireFamilyActor } from "@/lib/families/http";
import { updateFamilyInviteContact } from "@/lib/families/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const updateInviteContactSchema = z.object({
  email: z.string().trim().email().max(255),
});

function resolveSiteOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(request: Request, context: RouteContext) {
  const actorResult = await requireFamilyActor();
  if ("error" in actorResult) return actorResult.error;
  const actor = actorResult.actor;

  const inviteId = Number.parseInt((await context.params).id, 10);
  if (!Number.isInteger(inviteId) || inviteId < 1) {
    return NextResponse.json({ error: "Invalid invite id" }, { status: 400 });
  }

  const parsed = updateInviteContactSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await updateFamilyInviteContact({
      actorUserId: actor.id,
      inviteId,
      email: parsed.data.email,
      siteOrigin: resolveSiteOrigin(request),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return familyServiceErrorResponse(error);
  }
}
