import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import { declineMembershipApplication } from "@/lib/membership/application-service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const bodySchema = z.object({
  reviewNotes: z.string().trim().max(4000).default(""),
});

function parseApplicationId(rawId: string) {
  const applicationId = Number.parseInt(rawId, 10);
  if (!Number.isInteger(applicationId) || applicationId < 1) return null;
  return applicationId;
}

export async function POST(request: Request, context: RouteContext) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;
  const actor = adminResult.actor;

  const applicationId = parseApplicationId((await context.params).id);
  if (!applicationId) {
    return NextResponse.json({ error: "Invalid application id" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const declined = await declineMembershipApplication({
      applicationId,
      actor,
      reviewNotes: parsed.data.reviewNotes,
    });

    await writeAdminAuditLog({
      actorUserId: actor.id,
      action: "membership_application.declined",
      targetType: "membership_application",
      targetId: String(applicationId),
      payload: declined,
    });

    return NextResponse.json({ ok: true, ...declined });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to decline application" },
      { status: 400 },
    );
  }
}
