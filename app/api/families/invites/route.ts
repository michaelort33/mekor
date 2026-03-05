import { NextResponse } from "next/server";
import { z } from "zod";

import { requireFamilyActor, familyServiceErrorResponse, isMemberCapableRole } from "@/lib/families/http";
import { createFamilyInvite } from "@/lib/families/service";
import { allowWithinWindow } from "@/lib/invitations/rate-limit";

const createFamilyInviteSchema = z
  .object({
    familyId: z.number().int().min(1).optional(),
    email: z.string().trim().email().max(255).optional(),
    firstName: z.string().trim().min(1).max(120).optional(),
    lastName: z.string().trim().min(1).max(120).optional(),
    roleInFamily: z.enum(["primary_adult", "adult", "child", "dependent"]).optional(),
  })
  .refine((value) => Boolean(value.email || value.firstName || value.lastName), {
    message: "Provide an email or invitee first/last name",
    path: ["email"],
  });

function resolveSiteOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(request: Request) {
  const actorResult = await requireFamilyActor();
  if ("error" in actorResult) return actorResult.error;
  const actor = actorResult.actor;

  if (!isMemberCapableRole(actor.role)) {
    return NextResponse.json(
      { error: "Only member/admin accounts can create family invites." },
      { status: 403 },
    );
  }

  const parsed = createFamilyInviteSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateLimitKey = `family-invite-create:${actor.id}:${ip}`;
  if (!allowWithinWindow(rateLimitKey, 10, 60_000)) {
    return NextResponse.json({ error: "Too many invite attempts. Please wait and retry." }, { status: 429 });
  }

  try {
    const result = await createFamilyInvite({
      actorUserId: actor.id,
      familyId: parsed.data.familyId,
      email: parsed.data.email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      roleInFamily: parsed.data.roleInFamily,
      siteOrigin: resolveSiteOrigin(request),
    });
    return NextResponse.json({ invite: result });
  } catch (error) {
    return familyServiceErrorResponse(error);
  }
}
