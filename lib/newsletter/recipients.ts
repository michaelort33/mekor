import { and, asc, eq, inArray, sql } from "drizzle-orm";

import type { getDb } from "@/db/client";
import { duesInvoices, users } from "@/db/schema";

export const NEWSLETTER_RECIPIENT_GROUPS = [
  "all_members",
  "admins_only",
  "dues_outstanding",
  "directory_visible",
] as const;

export type NewsletterRecipientGroup = (typeof NEWSLETTER_RECIPIENT_GROUPS)[number];

export const NEWSLETTER_RECIPIENT_GROUP_LABELS: Record<NewsletterRecipientGroup, string> = {
  all_members: "All members",
  admins_only: "Admins only",
  dues_outstanding: "Members with dues outstanding",
  directory_visible: "Directory-visible members",
};

export type NewsletterRecipient = {
  userId: number;
  email: string;
  displayName: string;
};

type DbClient = ReturnType<typeof getDb>;

export async function loadRecipientsForGroup(db: DbClient, group: NewsletterRecipientGroup) {
  if (group === "all_members") {
    return db
      .select({
        userId: users.id,
        email: users.email,
        displayName: users.displayName,
      })
      .from(users)
      .where(inArray(users.role, ["member", "admin", "super_admin"]))
      .orderBy(asc(users.displayName), asc(users.id));
  }

  if (group === "admins_only") {
    return db
      .select({
        userId: users.id,
        email: users.email,
        displayName: users.displayName,
      })
      .from(users)
      .where(inArray(users.role, ["admin", "super_admin"]))
      .orderBy(asc(users.displayName), asc(users.id));
  }

  if (group === "directory_visible") {
    return db
      .select({
        userId: users.id,
        email: users.email,
        displayName: users.displayName,
      })
      .from(users)
      .where(
        and(
          inArray(users.role, ["member", "admin", "super_admin"]),
          inArray(users.profileVisibility, ["members", "public", "anonymous"]),
        ),
      )
      .orderBy(asc(users.displayName), asc(users.id));
  }

  return db
    .select({
      userId: users.id,
      email: users.email,
      displayName: users.displayName,
    })
    .from(users)
    .innerJoin(
      duesInvoices,
      and(
        eq(duesInvoices.userId, users.id),
        inArray(duesInvoices.status, ["open", "overdue"]),
      ),
    )
    .where(inArray(users.role, ["member", "admin", "super_admin"]))
    .groupBy(users.id, users.email, users.displayName)
    .having(sql`COUNT(${duesInvoices.id}) > 0`)
    .orderBy(asc(users.displayName), asc(users.id));
}
