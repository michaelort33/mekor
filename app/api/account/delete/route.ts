import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { people, users } from "@/db/schema";
import { requireAuthenticatedAccountAccess } from "@/lib/auth/account-access";
import { verifyPassword } from "@/lib/auth/password";
import { allowWithinWindow } from "@/lib/invitations/rate-limit";
import { buildInboxSummary, createAdminInboxEvent } from "@/lib/admin/inbox";

const requestSchema = z.object({
  password: z.string().min(1),
  confirmEmail: z.string().trim().email(),
  reason: z.string().trim().max(2000).optional().default(""),
});

export async function POST(request: Request) {
  const access = await requireAuthenticatedAccountAccess();
  if ("error" in access) return access.error;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!allowWithinWindow(`account-delete:${ip}:${access.session.userId}`, 3, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const db = getDb();
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.id, access.session.userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (parsed.data.confirmEmail.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ error: "Confirmation email does not match your account email." }, { status: 400 });
  }

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Password is incorrect." }, { status: 400 });
  }

  const [person] = await db
    .select({ phone: people.phone })
    .from(people)
    .where(eq(people.userId, user.id))
    .limit(1);

  const reason = parsed.data.reason.trim();
  const event = await createAdminInboxEvent({
    sourceType: "form_submission",
    category: "general_forms",
    sourceId: `account-delete:${user.id}:${Date.now()}`,
    title: `Account deletion request from ${user.displayName}`,
    submitterName: user.displayName,
    submitterEmail: user.email,
    submitterPhone: person?.phone ?? "",
    summary: buildInboxSummary({
      message: reason || "User has requested deletion of their account. No reason provided.",
      sourcePath: "/account/delete",
    }),
    payloadJson: {
      userId: user.id,
      requestedAt: new Date().toISOString(),
      reason,
    },
  });

  return NextResponse.json({ ok: true, ticketId: event.id });
}
