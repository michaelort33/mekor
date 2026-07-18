import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db/client";
import { newsletterSubscriptions } from "@/db/schema";

export function uniquePositiveIds(ids: number[]) {
  return [...new Set(ids.filter((id) => Number.isInteger(id) && id >= 1))];
}

/**
 * Split requested person IDs into those that are confirmed weekly subscribers
 * versus unknown / unsubscribed / wrong-topic IDs.
 */
export function partitionSelectedSubscriberIds(
  requestedIds: number[],
  subscribedIds: Iterable<number>,
): { allowedIds: number[]; rejectedIds: number[] } {
  const unique = uniquePositiveIds(requestedIds);
  const subscribed = new Set(subscribedIds);
  const allowedIds = unique.filter((id) => subscribed.has(id));
  const rejectedIds = unique.filter((id) => !subscribed.has(id));
  return { allowedIds, rejectedIds };
}

/** Load weekly subscribed person IDs that intersect the requested set. */
export async function resolveSelectedWeeklySubscribers(personIds: number[]) {
  const unique = uniquePositiveIds(personIds);
  if (unique.length === 0) {
    return { allowedIds: [] as number[], rejectedIds: [] as number[] };
  }

  const rows = await getDb()
    .select({ personId: newsletterSubscriptions.personId })
    .from(newsletterSubscriptions)
    .where(
      and(
        inArray(newsletterSubscriptions.personId, unique),
        eq(newsletterSubscriptions.topic, "weekly"),
        eq(newsletterSubscriptions.status, "subscribed"),
      ),
    );

  return partitionSelectedSubscriberIds(
    unique,
    rows.map((row) => row.personId),
  );
}
