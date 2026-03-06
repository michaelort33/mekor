import { and, asc, eq, inArray, or, sql } from "drizzle-orm";

import type { getDb } from "@/db/client";
import { communicationPreferences, duesInvoices, messageSuppressions, people, users } from "@/db/schema";

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

type NewsletterRecipientCandidate = NewsletterRecipient & {
  personId: number | null;
  emailOptIn: boolean | null;
  doNotContact: boolean | null;
};

type DbClient = ReturnType<typeof getDb>;

export function isNewsletterRecipientAllowed(input: {
  email: string;
  emailOptIn: boolean | null;
  doNotContact: boolean | null;
  suppressed: boolean;
}) {
  if (!input.email.trim()) return false;
  if (input.doNotContact === true) return false;
  if (input.emailOptIn === false) return false;
  if (input.suppressed) return false;
  return true;
}

function filterAllowedRecipients(input: {
  candidates: NewsletterRecipientCandidate[];
  suppressedEmails: Set<string>;
  suppressedPersonIds: Set<number>;
}) {
  return input.candidates
    .filter((candidate) =>
      isNewsletterRecipientAllowed({
        email: candidate.email,
        emailOptIn: candidate.emailOptIn,
        doNotContact: candidate.doNotContact,
        suppressed:
          input.suppressedEmails.has(candidate.email) ||
          (typeof candidate.personId === "number" && input.suppressedPersonIds.has(candidate.personId)),
      }),
    )
    .map(({ userId, email, displayName }) => ({
      userId,
      email,
      displayName,
    }));
}

async function resolveSuppressions(db: DbClient, candidates: NewsletterRecipientCandidate[]) {
  const emails = [...new Set(candidates.map((candidate) => candidate.email).filter(Boolean))];
  const personIds = [...new Set(candidates.map((candidate) => candidate.personId).filter((value): value is number => typeof value === "number"))];

  if (emails.length === 0 && personIds.length === 0) {
    return {
      suppressedEmails: new Set<string>(),
      suppressedPersonIds: new Set<number>(),
    };
  }

  const suppressions = await db
    .select({
      email: messageSuppressions.email,
      personId: messageSuppressions.personId,
    })
    .from(messageSuppressions)
    .where(
      and(
        eq(messageSuppressions.channel, "email"),
        emails.length > 0 && personIds.length > 0
          ? or(inArray(messageSuppressions.email, emails), inArray(messageSuppressions.personId, personIds))
          : emails.length > 0
            ? inArray(messageSuppressions.email, emails)
            : inArray(messageSuppressions.personId, personIds),
      ),
    );

  return {
    suppressedEmails: new Set(suppressions.map((row) => row.email).filter((value): value is string => Boolean(value))),
    suppressedPersonIds: new Set(
      suppressions.map((row) => row.personId).filter((value): value is number => typeof value === "number"),
    ),
  };
}

async function loadCandidatesForGroup(db: DbClient, group: NewsletterRecipientGroup) {
  if (group === "all_members") {
    return db
      .select({
        userId: users.id,
        email: users.email,
        displayName: users.displayName,
        personId: people.id,
        emailOptIn: communicationPreferences.emailOptIn,
        doNotContact: communicationPreferences.doNotContact,
      })
      .from(users)
      .leftJoin(people, eq(people.userId, users.id))
      .leftJoin(communicationPreferences, eq(communicationPreferences.personId, people.id))
      .where(inArray(users.role, ["member", "admin", "super_admin"]))
      .orderBy(asc(users.displayName), asc(users.id));
  }

  if (group === "admins_only") {
    return db
      .select({
        userId: users.id,
        email: users.email,
        displayName: users.displayName,
        personId: people.id,
        emailOptIn: communicationPreferences.emailOptIn,
        doNotContact: communicationPreferences.doNotContact,
      })
      .from(users)
      .leftJoin(people, eq(people.userId, users.id))
      .leftJoin(communicationPreferences, eq(communicationPreferences.personId, people.id))
      .where(inArray(users.role, ["admin", "super_admin"]))
      .orderBy(asc(users.displayName), asc(users.id));
  }

  if (group === "directory_visible") {
    return db
      .select({
        userId: users.id,
        email: users.email,
        displayName: users.displayName,
        personId: people.id,
        emailOptIn: communicationPreferences.emailOptIn,
        doNotContact: communicationPreferences.doNotContact,
      })
      .from(users)
      .leftJoin(people, eq(people.userId, users.id))
      .leftJoin(communicationPreferences, eq(communicationPreferences.personId, people.id))
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
      personId: people.id,
      emailOptIn: communicationPreferences.emailOptIn,
      doNotContact: communicationPreferences.doNotContact,
    })
    .from(users)
    .innerJoin(
      duesInvoices,
      and(
        eq(duesInvoices.userId, users.id),
        inArray(duesInvoices.status, ["open", "overdue"]),
      ),
    )
    .leftJoin(people, eq(people.userId, users.id))
    .leftJoin(communicationPreferences, eq(communicationPreferences.personId, people.id))
    .where(inArray(users.role, ["member", "admin", "super_admin"]))
    .groupBy(
      users.id,
      users.email,
      users.displayName,
      people.id,
      communicationPreferences.emailOptIn,
      communicationPreferences.doNotContact,
    )
    .having(sql`COUNT(${duesInvoices.id}) > 0`)
    .orderBy(asc(users.displayName), asc(users.id));
}

export async function loadRecipientsForGroup(db: DbClient, group: NewsletterRecipientGroup) {
  const candidates = await loadCandidatesForGroup(db, group);
  const suppressions = await resolveSuppressions(db, candidates);

  return filterAllowedRecipients({
    candidates,
    suppressedEmails: suppressions.suppressedEmails,
    suppressedPersonIds: suppressions.suppressedPersonIds,
  });
}
