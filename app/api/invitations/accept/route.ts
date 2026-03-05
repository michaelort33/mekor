import { and, eq, gt, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { userInvitations, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { createUserSession } from "@/lib/auth/session";
import { writeAdminAuditLog } from "@/lib/admin/actor";
import { allowWithinWindow } from "@/lib/invitations/rate-limit";
import { hashInvitationToken } from "@/lib/invitations/token";
import { attachPersonToUserByEmail } from "@/lib/people/service";
import { normalizeUserEmail } from "@/lib/users/validation";

const acceptInvitationSchema = z
  .object({
    token: z.string().trim().min(24).max(1024),
    displayName: z.string().trim().min(2).max(120),
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export async function POST(request: Request) {
  if (!process.env.USER_SESSION_SECRET) {
    return NextResponse.json({ error: "Auth session is not configured" }, { status: 500 });
  }

  const payload = await request.json().catch(() => ({}));
  const parsed = acceptInvitationSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const tokenHash = hashInvitationToken(parsed.data.token);
  const rateLimitKey = `invite-accept:${ip}:${tokenHash.slice(0, 24)}`;
  if (!allowWithinWindow(rateLimitKey, 5, 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Try again soon." }, { status: 429 });
  }

  const now = new Date();
  const db = getDb();

  const accepted = await db.transaction(async (tx) => {
    const [invitation] = await tx
      .update(userInvitations)
      .set({
        acceptedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(userInvitations.tokenHash, tokenHash),
          isNull(userInvitations.acceptedAt),
          isNull(userInvitations.revokedAt),
          gt(userInvitations.expiresAt, now),
        ),
      )
      .returning({
        id: userInvitations.id,
        email: userInvitations.email,
        role: userInvitations.role,
        personId: userInvitations.personId,
        invitedByUserId: userInvitations.invitedByUserId,
      });

    if (!invitation) {
      return null;
    }

    const email = normalizeUserEmail(invitation.email);
    const passwordHash = await hashPassword(parsed.data.password);

    const [existing] = await tx
      .select({
        id: users.id,
        role: users.role,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let user:
      | {
          id: number;
          email: string;
          role: "visitor" | "member" | "admin" | "super_admin";
        }
      | undefined;

    if (existing) {
      [user] = await tx
        .update(users)
        .set({
          role: invitation.role,
          lastLoginAt: now,
          updatedAt: now,
        })
        .where(eq(users.id, existing.id))
        .returning({
          id: users.id,
          email: users.email,
          role: users.role,
        });
    } else {
      [user] = await tx
        .insert(users)
        .values({
          email,
          displayName: parsed.data.displayName.trim(),
          passwordHash,
          role: invitation.role,
          lastLoginAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning({
          id: users.id,
          email: users.email,
          role: users.role,
        });
    }

    if (!user) {
      throw new Error("Unable to create invited user");
    }

    return {
      invitationId: invitation.id,
      invitationPersonId: invitation.personId,
      invitedByUserId: invitation.invitedByUserId,
      user,
      previousRole: existing?.role ?? null,
    };
  });

  if (!accepted) {
    return NextResponse.json({ error: "Invalid or expired invitation token" }, { status: 400 });
  }

  const linkedPerson = await attachPersonToUserByEmail({
    userId: accepted.user.id,
    email: accepted.user.email,
    role: accepted.user.role,
    actorUserId: accepted.invitedByUserId,
  });
  await getDb()
    .update(userInvitations)
    .set({
      personId: linkedPerson.personId,
      updatedAt: new Date(),
    })
    .where(eq(userInvitations.id, accepted.invitationId));

  await writeAdminAuditLog({
    actorUserId: accepted.invitedByUserId,
    action: "invitation.accepted",
    targetType: "user",
    targetId: String(accepted.user.id),
    payload: {
      invitationId: accepted.invitationId,
      email: accepted.user.email,
      role: accepted.user.role,
      previousRole: accepted.previousRole,
    },
  });

  await createUserSession({
    userId: accepted.user.id,
    role: accepted.user.role,
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: accepted.user.id,
      email: accepted.user.email,
      role: accepted.user.role,
    },
  });
}
