import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { userInvitations } from "@/db/schema";
import { requireSuperAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import { sendInvitationEmail } from "@/lib/invitations/email";
import { generateInvitationToken, hashInvitationToken, invitationExpiryFromNow } from "@/lib/invitations/token";
import { persistThenDeliver } from "@/lib/notifications/persist-after-delivery";
import { ensurePersonByEmail } from "@/lib/people/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const adminResult = await requireSuperAdminActor();
  if ("error" in adminResult) return adminResult.error;
  const actor = adminResult.actor;

  const invitationId = Number.parseInt((await context.params).id, 10);
  if (!Number.isInteger(invitationId) || invitationId < 1) {
    return NextResponse.json({ error: "Invalid invitation id" }, { status: 400 });
  }

  const [existing] = await getDb()
    .select({
      id: userInvitations.id,
      email: userInvitations.email,
      role: userInvitations.role,
      acceptedAt: userInvitations.acceptedAt,
      revokedAt: userInvitations.revokedAt,
      expiresAt: userInvitations.expiresAt,
    })
    .from(userInvitations)
    .where(eq(userInvitations.id, invitationId))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }
  if (existing.acceptedAt) {
    return NextResponse.json({ error: "Accepted invitations cannot be resent" }, { status: 400 });
  }

  const now = new Date();
  const token = generateInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = invitationExpiryFromNow();

  const origin = new URL(request.url).origin;
  const acceptUrl = `${origin}/invite/accept?token=${encodeURIComponent(token)}`;
  try {
    const result = await persistThenDeliver({
      persist: async () => {
        const person = await ensurePersonByEmail({
          email: existing.email,
          status: "invited",
          source: "invitation_resend",
          actorUserId: actor.id,
        });

        const [replacement] = await getDb().transaction(async (tx) => {
          const [currentInvite] = await tx
            .select({
              id: userInvitations.id,
            })
            .from(userInvitations)
            .where(and(eq(userInvitations.id, invitationId), isNull(userInvitations.acceptedAt), isNull(userInvitations.revokedAt)))
            .limit(1);

          if (!currentInvite) {
            throw new Error("Invitation cannot be resent");
          }

          await tx
            .update(userInvitations)
            .set({
              revokedAt: now,
              updatedAt: now,
            })
            .where(eq(userInvitations.id, invitationId));

          return tx
            .insert(userInvitations)
            .values({
              email: existing.email,
              role: existing.role,
              personId: person.personId,
              invitedByUserId: actor.id,
              tokenHash,
              expiresAt,
              createdAt: now,
              updatedAt: now,
            })
            .returning({
              id: userInvitations.id,
              expiresAt: userInvitations.expiresAt,
            });
        });

        return replacement;
      },
      deliver: async () => {
        await sendInvitationEmail({
          toEmail: existing.email,
          inviterName: actor.email,
          role: existing.role,
          acceptUrl,
          expiresAt,
        });
      },
    });

    await writeAdminAuditLog({
      actorUserId: actor.id,
      action: "invitation.resent",
      targetType: "user_invitation",
      targetId: String(result.persisted.id),
      payload: {
        previousInvitationId: invitationId,
        email: existing.email,
        role: existing.role,
        expiresAt: result.persisted.expiresAt.toISOString(),
      },
    });

    return NextResponse.json({
      invitationId: result.persisted.id,
      expiresAt: result.persisted.expiresAt.toISOString(),
      emailDelivered: result.delivered,
      warning: result.delivered ? null : "Invitation resent, but the email could not be delivered.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to resend invitation",
      },
      { status: 500 },
    );
  }
}
