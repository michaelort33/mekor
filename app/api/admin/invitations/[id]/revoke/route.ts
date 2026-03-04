import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { userInvitations } from "@/db/schema";
import { requireSuperAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  const adminResult = await requireSuperAdminActor();
  if ("error" in adminResult) return adminResult.error;
  const actor = adminResult.actor;

  const invitationId = Number.parseInt((await context.params).id, 10);
  if (!Number.isInteger(invitationId) || invitationId < 1) {
    return NextResponse.json({ error: "Invalid invitation id" }, { status: 400 });
  }

  const [revoked] = await getDb()
    .update(userInvitations)
    .set({
      revokedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(userInvitations.id, invitationId), isNull(userInvitations.acceptedAt), isNull(userInvitations.revokedAt)))
    .returning({
      id: userInvitations.id,
    });

  if (!revoked) {
    return NextResponse.json({ error: "Invitation cannot be revoked" }, { status: 400 });
  }

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "invitation.revoked",
    targetType: "user_invitation",
    targetId: String(revoked.id),
    payload: {},
  });

  return NextResponse.json({ ok: true });
}
