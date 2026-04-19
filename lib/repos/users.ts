import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { users } from "@/db/schema";

export type UserRow = typeof users.$inferSelect;

export async function findUserById(userId: number): Promise<UserRow | null> {
  const [row] = await getDb().select().from(users).where(eq(users.id, userId)).limit(1);
  return row ?? null;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const normalized = email.trim().toLowerCase();
  const [row] = await getDb().select().from(users).where(eq(users.email, normalized)).limit(1);
  return row ?? null;
}

export type UserAccountSummary = {
  id: number;
  email: string;
  displayName: string;
  role: UserRow["role"];
  avatarUrl: string;
  city: string;
  membershipRenewalDate: string | null;
  autoMessagesEnabled: boolean;
  lastLoginAt: string | null;
};

export async function findUserAccountSummary(userId: number): Promise<UserAccountSummary | null> {
  const [row] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      avatarUrl: users.avatarUrl,
      city: users.city,
      membershipRenewalDate: users.membershipRenewalDate,
      autoMessagesEnabled: users.autoMessagesEnabled,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) return null;
  return {
    ...row,
    membershipRenewalDate: row.membershipRenewalDate ?? null,
    lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
  };
}

export async function updateUserPasswordHash(userId: number, passwordHash: string): Promise<void> {
  await getDb()
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function setAutoMessagesEnabled(userId: number, enabled: boolean): Promise<void> {
  await getDb()
    .update(users)
    .set({ autoMessagesEnabled: enabled, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
