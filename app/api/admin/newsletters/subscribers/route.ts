import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { newsletterSubscriptions, people } from "@/db/schema";
import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import { syncNewsletterEmailPreference } from "@/lib/newsletter/subscriptions";

const updateSchema = z.object({
  id: z.number().int().min(1),
  status: z.enum(["subscribed", "unsubscribed"]),
});

export async function GET(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const status = url.searchParams.get("status")?.trim() ?? "";
  const topic = url.searchParams.get("topic")?.trim() ?? "";
  const rows = await getDb()
    .select({
      id: newsletterSubscriptions.id,
      personId: newsletterSubscriptions.personId,
      topic: newsletterSubscriptions.topic,
      status: newsletterSubscriptions.status,
      source: newsletterSubscriptions.source,
      confirmedAt: newsletterSubscriptions.confirmedAt,
      unsubscribedAt: newsletterSubscriptions.unsubscribedAt,
      updatedAt: newsletterSubscriptions.updatedAt,
      displayName: people.displayName,
      email: people.email,
    })
    .from(newsletterSubscriptions)
    .innerJoin(people, eq(people.id, newsletterSubscriptions.personId))
    .where(
      and(
        q ? or(ilike(people.email, `%${q}%`), ilike(people.displayName, `%${q}%`)) : undefined,
        status ? eq(newsletterSubscriptions.status, status as "pending" | "subscribed" | "unsubscribed" | "bounced" | "complained") : undefined,
        topic ? eq(newsletterSubscriptions.topic, topic) : undefined,
      ),
    )
    .orderBy(desc(newsletterSubscriptions.updatedAt))
    .limit(5000);

  const counts = await getDb()
    .select({ status: newsletterSubscriptions.status, count: sql<number>`count(*)::int` })
    .from(newsletterSubscriptions)
    .groupBy(newsletterSubscriptions.status);
  const topicCounts = await getDb()
    .select({ topic: newsletterSubscriptions.topic, count: sql<number>`count(*)::int` })
    .from(newsletterSubscriptions)
    .groupBy(newsletterSubscriptions.topic);
  const [uniquePeople] = await getDb()
    .select({ count: sql<number>`count(distinct ${newsletterSubscriptions.personId})::int` })
    .from(newsletterSubscriptions);
  return NextResponse.json({
    subscribers: rows,
    counts: Object.fromEntries(counts.map((row) => [row.status, row.count])),
    topicCounts: Object.fromEntries(topicCounts.map((row) => [row.topic, row.count])),
    uniquePeople: uniquePeople?.count ?? 0,
  });
}

export async function PUT(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;
  const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  const now = new Date();
  const [subscription] = await getDb()
    .update(newsletterSubscriptions)
    .set({
      status: parsed.data.status,
      source: "admin",
      confirmedAt: parsed.data.status === "subscribed" ? now : null,
      unsubscribedAt: parsed.data.status === "unsubscribed" ? now : null,
      updatedAt: now,
    })
    .where(eq(newsletterSubscriptions.id, parsed.data.id))
    .returning();
  if (!subscription) return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
  await syncNewsletterEmailPreference(subscription.personId);
  await writeAdminAuditLog({
    actorUserId: adminResult.actor.id,
    action: `newsletter.subscriber.${parsed.data.status}`,
    targetType: "newsletter_subscription",
    targetId: String(subscription.id),
    payload: { personId: subscription.personId, topic: subscription.topic },
  });
  return NextResponse.json({ subscription });
}
