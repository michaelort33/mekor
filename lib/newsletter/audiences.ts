import { and, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { newsletterSubscriptions, people, users } from "@/db/schema";
import { NEWSLETTER_RECIPIENT_LISTS } from "@/lib/newsletter/recipient-lists";

/** Friendly names for imported list topics; unknown topics fall back to a capitalized key. */
const TOPIC_LABELS: Record<string, string> = {
  weekly: "Weekly Shabbat Newsletter",
  announcements: "Announcements",
  events: "Events",
  kids: "MekorKids",
};

export type NewsletterAudience = {
  key: string;
  name: string;
  description: string;
  recipientGroup: "recipient_list" | "newsletter_subscribers" | "admins_only";
  topic?: string;
  count: number;
};

function topicLabel(topic: string) {
  return TOPIC_LABELS[topic] ?? topic.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Key format shared with the send flow: weekly keeps the legacy key, other topics are `topic:<key>`. */
export function audienceKeyForTopic(topic: string) {
  return topic === "weekly" ? "newsletter_subscribers" : `topic:${topic}`;
}

export function topicFromAudienceKey(key: string): string | null {
  if (key === "newsletter_subscribers") return "weekly";
  const match = /^topic:([a-z0-9_-]{1,80})$/.exec(key);
  return match ? match[1] : null;
}

/**
 * Every audience the send wizard can target, with live subscriber counts:
 * the safe test list, one entry per subscription topic in the database
 * (weekly, announcements, events, kids, …), and admins.
 */
export async function listNewsletterAudiences(): Promise<NewsletterAudience[]> {
  const [topicRows, adminRows] = await Promise.all([
    getDb()
      .select({
        topic: newsletterSubscriptions.topic,
        count: sql<number>`count(*)::int`,
      })
      .from(newsletterSubscriptions)
      .where(eq(newsletterSubscriptions.status, "subscribed"))
      .groupBy(newsletterSubscriptions.topic),
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(people)
      .innerJoin(users, eq(users.id, people.userId))
      .where(and(inArray(users.role, ["admin", "super_admin"]))),
  ]);

  const testList = NEWSLETTER_RECIPIENT_LISTS.find((list) => list.key === "michael_test");
  const audiences: NewsletterAudience[] = [];

  if (testList) {
    audiences.push({
      key: "michael_test",
      name: testList.name,
      description: testList.description,
      recipientGroup: "recipient_list",
      count: testList.emails.length,
    });
  }

  const orderedTopics = [...topicRows].sort((a, b) =>
    a.topic === "weekly" ? -1 : b.topic === "weekly" ? 1 : b.count - a.count,
  );
  for (const row of orderedTopics) {
    audiences.push({
      key: audienceKeyForTopic(row.topic),
      name: topicLabel(row.topic),
      description: `${row.count} confirmed subscriber${row.count === 1 ? "" : "s"}`,
      recipientGroup: "newsletter_subscribers",
      topic: row.topic,
      count: row.count,
    });
  }

  audiences.push({
    key: "admins_only",
    name: "Admins only",
    description: `${adminRows[0]?.count ?? 0} Mekor administrators`,
    recipientGroup: "admins_only",
    count: adminRows[0]?.count ?? 0,
  });

  return audiences;
}
