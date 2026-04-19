import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { requireAuthenticatedAccountAccess } from "@/lib/auth/account-access";
import { hashPassword, USER_PASSWORD_MIN_LENGTH, verifyPassword } from "@/lib/auth/password";

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(USER_PASSWORD_MIN_LENGTH),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export async function GET() {
  const access = await requireAuthenticatedAccountAccess();
  if ("error" in access) return access.error;

  const [row] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, access.session.userId))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    account: {
      ...row,
      lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      accessState: access.accessState,
    },
  });
}

export async function PUT(request: Request) {
  const access = await requireAuthenticatedAccountAccess();
  if ("error" in access) return access.error;

  const parsed = passwordChangeSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const db = getDb();
  const [row] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, access.session.userId))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const ok = await verifyPassword(parsed.data.currentPassword, row.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return NextResponse.json(
      { error: "New password must differ from the current password" },
      { status: 400 },
    );
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await db
    .update(users)
    .set({ passwordHash: newHash, updatedAt: new Date() })
    .where(eq(users.id, access.session.userId));

  return NextResponse.json({ ok: true });
}
