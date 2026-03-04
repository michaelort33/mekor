import { and, asc, desc, eq, gte, inArray, notInArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { duesInvoices, duesPayments, eventRegistrations, events, inTheNews, users } from "@/db/schema";
import { getUserSession } from "@/lib/auth/session";
import { isFeatureEnabled } from "@/lib/config/features";

export async function GET() {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const now = new Date();

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      profileVisibility: users.profileVisibility,
      lastLoginAt: users.lastLoginAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const duesEnabled = await isFeatureEnabled("FEATURE_DUES");
  const eventsEnabled = await isFeatureEnabled("FEATURE_EVENT_SIGNUPS");

  const openInvoices = duesEnabled
    ? await db
        .select({
          id: duesInvoices.id,
          label: duesInvoices.label,
          amountCents: duesInvoices.amountCents,
          currency: duesInvoices.currency,
          dueDate: duesInvoices.dueDate,
          status: duesInvoices.status,
        })
        .from(duesInvoices)
        .where(and(eq(duesInvoices.userId, session.userId), inArray(duesInvoices.status, ["open", "overdue"])))
        .orderBy(asc(duesInvoices.dueDate))
    : [];

  const recentPayments = duesEnabled
    ? await db
        .select({
          id: duesPayments.id,
          invoiceId: duesPayments.invoiceId,
          amountCents: duesPayments.amountCents,
          currency: duesPayments.currency,
          status: duesPayments.status,
          processedAt: duesPayments.processedAt,
          createdAt: duesPayments.createdAt,
          invoiceLabel: duesInvoices.label,
        })
        .from(duesPayments)
        .innerJoin(duesInvoices, eq(duesInvoices.id, duesPayments.invoiceId))
        .where(eq(duesPayments.userId, session.userId))
        .orderBy(desc(duesPayments.createdAt))
        .limit(8)
    : [];

  const upcomingRegistrations = eventsEnabled
    ? await db
        .select({
          id: eventRegistrations.id,
          eventId: eventRegistrations.eventId,
          status: eventRegistrations.status,
          registeredAt: eventRegistrations.registeredAt,
          paymentDueAt: eventRegistrations.paymentDueAt,
          eventTitle: events.title,
          eventPath: events.path,
          eventStartAt: events.startAt,
        })
        .from(eventRegistrations)
        .innerJoin(events, eq(events.id, eventRegistrations.eventId))
        .where(
          and(
            eq(eventRegistrations.userId, session.userId),
            inArray(eventRegistrations.status, ["registered", "waitlisted", "payment_pending"]),
            gte(events.startAt, now),
          ),
        )
        .orderBy(asc(events.startAt))
        .limit(8)
    : [];

  const alreadyRegisteredEventIds = upcomingRegistrations.map((row) => row.eventId);

  const suggestedEvents = eventsEnabled
    ? await db
        .select({
          id: events.id,
          title: events.title,
          path: events.path,
          startAt: events.startAt,
          location: events.location,
        })
        .from(events)
        .where(
          and(
            eq(events.isClosed, false),
            gte(events.startAt, now),
            alreadyRegisteredEventIds.length > 0 ? notInArray(events.id, alreadyRegisteredEventIds) : undefined,
          ),
        )
        .orderBy(asc(events.startAt))
        .limit(6)
    : [];

  const announcements = await db
    .select({
      id: inTheNews.id,
      title: inTheNews.title,
      path: inTheNews.path,
      publication: inTheNews.publication,
      publishedLabel: inTheNews.publishedLabel,
      publishedAt: inTheNews.publishedAt,
    })
    .from(inTheNews)
    .orderBy(desc(inTheNews.publishedAt), desc(inTheNews.createdAt))
    .limit(5);

  const activity = [
    ...recentPayments.map((payment) => ({
      kind: "payment" as const,
      id: `payment-${payment.id}`,
      timestamp: payment.processedAt ?? payment.createdAt,
      label: `${payment.invoiceLabel} · ${payment.status}`,
    })),
    ...upcomingRegistrations.map((registration) => ({
      kind: "registration" as const,
      id: `registration-${registration.id}`,
      timestamp: registration.registeredAt,
      label: `${registration.eventTitle} · ${registration.status}`,
      href: registration.eventPath,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const totalDueCents = openInvoices.reduce((sum, invoice) => sum + invoice.amountCents, 0);

  return NextResponse.json({
    summary: {
      displayName: user.displayName,
      role: user.role,
      profileVisibility: user.profileVisibility,
      lastLoginAt: user.lastLoginAt,
      profileUpdatedAt: user.updatedAt,
      openInvoicesCount: openInvoices.length,
      totalDueCents,
      upcomingRegistrationsCount: upcomingRegistrations.length,
    },
    dues: {
      enabled: duesEnabled,
      openInvoices,
      recentPayments,
    },
    events: {
      enabled: eventsEnabled,
      upcomingRegistrations,
      suggestedEvents,
    },
    activity,
    announcements,
  });
}
