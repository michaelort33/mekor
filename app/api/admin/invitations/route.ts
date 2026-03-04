import { and, asc, gt, ilike, isNotNull, isNull, lt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSuperAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import { getDb } from "@/db/client";
import { userInvitations } from "@/db/schema";
import { sendInvitationEmail } from "@/lib/invitations/email";
import { generateInvitationToken, hashInvitationToken, invitationExpiryFromNow } from "@/lib/invitations/token";
import { normalizeUserEmail } from "@/lib/users/validation";

const USER_ROLES = ["visitor", "member", "admin", "super_admin"] as const;
const createInvitationSchema = z.object({
  email: z.string().trim().email().max(255),
  role: z.enum(USER_ROLES),
});

const invitationStatusSchema = z.enum(["active", "accepted", "expired", "revoked"]);

export async function GET(request: Request) {
  const result = await requireSuperAdminActor();
  if ("error" in result) return result.error;

  const url = new URL(request.url);
  const statusRaw = url.searchParams.get("status");
  const emailRaw = url.searchParams.get("email")?.trim() ?? "";
  const status = invitationStatusSchema.safeParse(statusRaw).success
    ? (statusRaw as z.infer<typeof invitationStatusSchema>)
    : null;

  const whereClause = and(
    emailRaw ? ilike(userInvitations.email, `%${normalizeUserEmail(emailRaw)}%`) : undefined,
    status === "accepted"
      ? isNotNull(userInvitations.acceptedAt)
      : status === "revoked"
        ? isNotNull(userInvitations.revokedAt)
        : status === "expired"
        ? and(isNull(userInvitations.acceptedAt), isNull(userInvitations.revokedAt), lt(userInvitations.expiresAt, new Date()))
          : status === "active"
            ? and(isNull(userInvitations.acceptedAt), isNull(userInvitations.revokedAt), gt(userInvitations.expiresAt, new Date()))
            : undefined,
  );

  const rows = await getDb()
    .select({
      id: userInvitations.id,
      email: userInvitations.email,
      role: userInvitations.role,
      invitedByUserId: userInvitations.invitedByUserId,
      expiresAt: userInvitations.expiresAt,
      acceptedAt: userInvitations.acceptedAt,
      revokedAt: userInvitations.revokedAt,
      createdAt: userInvitations.createdAt,
    })
    .from(userInvitations)
    .where(whereClause)
    .orderBy(asc(userInvitations.createdAt));

  const now = Date.now();
  const invitations = rows.map((row) => {
    const derivedStatus = row.acceptedAt
      ? "accepted"
      : row.revokedAt
        ? "revoked"
        : row.expiresAt.getTime() <= now
          ? "expired"
          : "active";
    return {
      ...row,
      status: derivedStatus,
    };
  });

  return NextResponse.json({ invitations });
}

export async function POST(request: Request) {
  const result = await requireSuperAdminActor();
  if ("error" in result) return result.error;
  const actor = result.actor;

  const parsed = createInvitationSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const email = normalizeUserEmail(parsed.data.email);
  const token = generateInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = invitationExpiryFromNow();

  const [created] = await getDb()
    .insert(userInvitations)
    .values({
      email,
      role: parsed.data.role,
      invitedByUserId: actor.id,
      tokenHash,
      expiresAt,
    })
    .returning({
      id: userInvitations.id,
      expiresAt: userInvitations.expiresAt,
    });

  const origin = new URL(request.url).origin;
  const acceptUrl = `${origin}/invite/accept?token=${encodeURIComponent(token)}`;
  await sendInvitationEmail({
    toEmail: email,
    inviterName: actor.email,
    role: parsed.data.role,
    acceptUrl,
    expiresAt,
  });

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "invitation.created",
    targetType: "user_invitation",
    targetId: String(created.id),
    payload: {
      email,
      role: parsed.data.role,
      expiresAt: created.expiresAt.toISOString(),
    },
  });

  return NextResponse.json({
    invitationId: created.id,
    expiresAt: created.expiresAt.toISOString(),
  });
}
