import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { membershipPipelineEvents, people, userInvitations } from "@/db/schema";
import { requireSuperAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import { sendInvitationEmail } from "@/lib/invitations/email";
import { generateInvitationToken, hashInvitationToken, invitationExpiryFromNow } from "@/lib/invitations/token";
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

  const [invitation] = await getDb().transaction(async (tx) => {
    const [created] = await tx
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
        invitationId: created.id,
        role: parsed.data.role,
        expiresAt: created.expiresAt.toISOString(),
      },
      occurredAt: now,
      createdAt: now,
    });
    return [created];
  });

  const origin = new URL(request.url).origin;
  const acceptUrl = `${origin}/invite/accept?token=${encodeURIComponent(token)}`;
  await sendInvitationEmail({
    toEmail: email,
    inviterName: actor.email,
    role: parsed.data.role,
    acceptUrl,
    expiresAt: invitation.expiresAt,
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
}
