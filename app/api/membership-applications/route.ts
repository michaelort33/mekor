import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { hashPassword } from "@/lib/auth/password";
import { createUserSession, getUserSession } from "@/lib/auth/session";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { canAccessMembersArea, resolveAccountAccess } from "@/lib/auth/account-access";
import { createMembershipApplicationRecord } from "@/lib/membership/application-service";
import { buildApplicantDisplayName, membershipApplicationSchema } from "@/lib/membership/applications";
import { ensurePersonForUser } from "@/lib/people/service";
import { normalizeUserEmail } from "@/lib/users/validation";

const accountCredentialsSchema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const parsed = membershipApplicationSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const session = await getUserSession();
  let submittedByUserId = session?.userId ?? null;
  const email = normalizeUserEmail(parsed.data.email);

  if (session) {
    const [existingUser] = await getDb()
      .select({
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!existingUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (normalizeUserEmail(existingUser.email) !== email) {
      return NextResponse.json(
        {
          error: "Submit your membership application with the same email address as your signed-in account.",
        },
        { status: 400 },
      );
    }

    const access = await resolveAccountAccess(session.userId);
    if (access && canAccessMembersArea(access)) {
      return NextResponse.json(
        {
          error: "This account already has member access.",
        },
        { status: 409 },
      );
    }

    if (access?.accessState === "pending_approval") {
      return NextResponse.json(
        {
          error: "A membership application for this account is already pending approval.",
        },
        { status: 409 },
      );
    }
  }

  if (!session) {
    const credentials = accountCredentialsSchema.safeParse(payload);
    if (!credentials.success) {
      return NextResponse.json(
        {
          error: "Create an account password to submit your application.",
          issues: credentials.error.flatten(),
        },
        { status: 400 },
      );
    }

    const [existingUser] = await getDb()
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      return NextResponse.json(
        {
          error: "That email already has an account. Log in before submitting your membership application.",
        },
        { status: 409 },
      );
    }

    const now = new Date();
    const passwordHash = await hashPassword(credentials.data.password);
    const [createdUser] = await getDb()
      .insert(users)
      .values({
        email,
        passwordHash,
        displayName: buildApplicantDisplayName(parsed.data),
        city: parsed.data.city,
        role: "visitor",
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: users.id, role: users.role });

    submittedByUserId = createdUser.id;
    await ensurePersonForUser({
      userId: createdUser.id,
      source: "membership_application_signup",
      actorUserId: createdUser.id,
    });
    await createUserSession({
      userId: createdUser.id,
      role: createdUser.role,
    });
  }

  const created = await createMembershipApplicationRecord({
    ...parsed.data,
    submittedByUserId,
  });
  return NextResponse.json(
    {
      ok: true,
      applicationId: created.applicationId,
      submittedAt: created.createdAt.toISOString(),
      submittedByUserId,
    },
    { status: 201 },
  );
}
