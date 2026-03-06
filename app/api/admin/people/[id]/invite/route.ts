import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { membershipPipelineEvents, people, userInvitations } from "@/db/schema";
import { requireSuperAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import { sendInvitationEmail } from "@/lib/invitations/email";
import { generateInvitationToken, hashInvitationToken, invitationExpiryFromNow } from "@/lib/invitations/token";
import { persistAfterSuccessfulDelivery } from "@/lib/notifications/persist-after-delivery";
import { normalizeUserEmail } from "@/lib/users/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const invitePayloadSchema = z.object({
  role: z.enum(["visitor", "member", "admin", "super_admin"]).default("visitor"),
});

function parsePersonId(rawId: string) {
  const personId = Number.parseInt(rawId, 10);
  if (!Number.isInteger(personId) || personId < 1) return null;
  return personId;
}

export async function POST(request: Request, context: RouteContext) {
  const adminResult = await requireSuperAdminActor();
  if ("error" in adminResult) return adminResult.error;
  const actor = adminResult.actor;

  const personId = parsePersonId((await context.params).id);
  if (!personId) {
    return NextResponse.json({ error: "Invalid person id" }, { status: 400 });
  }

  const parsed = invitePayloadSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const [person] = await getDb()
    .select({
      id: people.id,
      email: people.email,
      displayName: people.displayName,
      status: people.status,
    })
    .from(people)
    .where(eq(people.id, personId))
    .limit(1);

  if (!person) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }
  if (!person.email) {
    return NextResponse.json({ error: "Person has no email address" }, { status: 400 });
  }

  const now = new Date();
  const token = generateInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = invitationExpiryFromNow();
  const email = normalizeUserEmail(person.email);

  const origin = new URL(request.url).origin;
  const acceptUrl = `${origin}/invite/accept?token=${encodeURIComponent(token)}`;
  try {
    const invitation = await persistAfterSuccessfulDelivery({
      deliver: async () => {
        await sendInvitationEmail({
          toEmail: email,
          inviterName: actor.email,
          role: parsed.data.role,
          acceptUrl,
          expiresAt,
        });
      },
      persist: async () => {
        const [created] = await getDb().transaction(async (tx) => {
          const [currentPerson] = await tx
            .select({ id: people.id })
            .from(people)
            .where(eq(people.id, person.id))
            .limit(1);

          if (!currentPerson) {
            throw new Error("Person not found");
          }

          const [createdInvitation] = await tx
            .insert(userInvitations)
            .values({
              email,
              role: parsed.data.role,
              personId: person.id,
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

          await tx
            .update(people)
            .set({
              status: "invited",
              invitedAt: now,
              updatedAt: now,
            })
            .where(eq(people.id, person.id));

          await tx.insert(membershipPipelineEvents).values({
            personId: person.id,
            actorUserId: actor.id,
            eventType: "invited",
            summary: `Invitation sent as ${parsed.data.role}`,
            payloadJson: {
              invitationId: createdInvitation.id,
              role: parsed.data.role,
              expiresAt: createdInvitation.expiresAt.toISOString(),
            },
            occurredAt: now,
            createdAt: now,
          });
          return [createdInvitation];
        });

        return created;
      },
    });

    await writeAdminAuditLog({
      actorUserId: actor.id,
      action: "people.invited",
      targetType: "person",
      targetId: String(person.id),
      payload: {
        invitationId: invitation.id,
        email,
        role: parsed.data.role,
        expiresAt: invitation.expiresAt.toISOString(),
      },
    });

    return NextResponse.json({
      invitationId: invitation.id,
      expiresAt: invitation.expiresAt.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to send invitation email",
      },
      { status: 502 },
    );
  }
}
