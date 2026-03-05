"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { MembersBreadcrumbs } from "@/components/members/members-breadcrumbs";
import styles from "./page.module.css";

type DashboardResponse = {
  summary: {
    displayName: string;
    role: "visitor" | "member" | "admin" | "super_admin";
    profileVisibility: "private" | "members" | "public" | "anonymous";
    lastLoginAt: string | null;
    profileUpdatedAt: string;
    openInvoicesCount: number;
    totalDueCents: number;
    upcomingRegistrationsCount: number;
  };
  dues: {
    enabled: boolean;
    openInvoices: Array<{
      id: number;
      label: string;
      amountCents: number;
      currency: string;
      dueDate: string;
      status: "open" | "overdue" | "paid" | "void";
    }>;
    recentPayments: Array<{
      id: number;
      invoiceId: number;
      amountCents: number;
      currency: string;
      status: "pending" | "succeeded" | "failed" | "refunded";
      processedAt: string | null;
      createdAt: string;
      invoiceLabel: string;
    }>;
  };
  events: {
    enabled: boolean;
    upcomingRegistrations: Array<{
      id: number;
      eventId: number;
      status: "registered" | "waitlisted" | "cancelled" | "payment_pending";
      registeredAt: string;
      paymentDueAt: string | null;
      eventTitle: string;
      eventPath: string;
      eventStartAt: string | null;
    }>;
    suggestedEvents: Array<{
      id: number;
      title: string;
      path: string;
      startAt: string | null;
      location: string;
    }>;
  };
  activity: Array<{
    kind: "payment" | "registration";
    id: string;
    timestamp: string;
    label: string;
    href?: string;
  }>;
  announcements: Array<{
    id: number;
    title: string;
    path: string;
    publication: string;
    publishedLabel: string;
    publishedAt: string | null;
  }>;
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export default function AccountDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [memberStats, setMemberStats] = useState<{
    eventsHostedCount: number;
    approvedAttendeesTotal: number;
    uniqueAttendeesCount: number;
    upcomingHostedCount: number;
    attendanceRate: number;
  } | null>(null);

  useEffect(() => {
    async function load() {
      const [response, statsResponse] = await Promise.all([
        fetch("/api/account/dashboard"),
        fetch("/api/account/member-stats"),
      ]);
      if (response.status === 401) {
        router.replace("/login?next=/account");
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as DashboardResponse & { error?: string };
      if (!response.ok) {
        setError(payload.error || "Unable to load dashboard");
        setLoading(false);
        return;
      }

      setDashboard(payload);
      if (statsResponse.ok) {
        const statsPayload = (await statsResponse.json().catch(() => ({}))) as {
          stats?: {
            eventsHostedCount: number;
            approvedAttendeesTotal: number;
            uniqueAttendeesCount: number;
            upcomingHostedCount: number;
            attendanceRate: number;
          };
        };
        setMemberStats(statsPayload.stats ?? null);
      }
      setLoading(false);
    }

    load().catch(() => {
      setError("Unable to load dashboard");
      setLoading(false);
    });
  }, [router]);

  const totalRecentPayments = useMemo(() => {
    if (!dashboard) return 0;
    return dashboard.dues.recentPayments.reduce((sum, payment) => sum + payment.amountCents, 0);
  }, [dashboard]);

  if (loading) {
    return <main className={styles.page}>Loading account dashboard...</main>;
  }

  if (!dashboard) {
    return <main className={styles.page}>{error || "Dashboard unavailable"}</main>;
  }

  return (
    <main className={`${styles.page} internal-page`}>
      <MembersBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Members Area", href: "/members" },
          { label: "Dashboard" },
        ]}
        context="member"
        activeSection="dashboard"
      />

      <header className={`${styles.header} internal-header`}>
        <div>
          <h1>Welcome, {dashboard.summary.displayName}</h1>
          <p>Track dues, events, and community updates from one place.</p>
        </div>
        <div className={`${styles.quickLinks} internal-actions`}>
          <Link href="/account/profile">Profile</Link>
          <Link href="/account/dues">Dues</Link>
          <Link href="/account/member-events">Host Events</Link>
          <Link href="/account/family">Family</Link>
          <Link href="/account/inbox">Inbox</Link>
          <Link href="/members">Members Area</Link>
          <Link href="/events">Events</Link>
        </div>
      </header>

      {error ? <p className={styles.error}>{error}</p> : null}

      <section className={styles.summaryGrid}>
        <article className={`${styles.card} internal-card`}>
          <h2>Amount Due</h2>
          <p className={styles.metric}>{formatMoney(dashboard.summary.totalDueCents, "usd")}</p>
          <p>{dashboard.summary.openInvoicesCount} open invoice(s)</p>
        </article>
        <article className={`${styles.card} internal-card`}>
          <h2>Upcoming Registrations</h2>
          <p className={styles.metric}>{dashboard.summary.upcomingRegistrationsCount}</p>
          <p>events currently on your calendar</p>
        </article>
        <article className={`${styles.card} internal-card`}>
          <h2>Recent Payments</h2>
          <p className={styles.metric}>{formatMoney(totalRecentPayments, "usd")}</p>
          <p>across your latest dues transactions</p>
        </article>
        {memberStats ? (
          <article className={`${styles.card} internal-card`}>
            <h2>Host Stats</h2>
            <p className={styles.metric}>{memberStats.eventsHostedCount}</p>
            <p>
              {memberStats.approvedAttendeesTotal} approved attendees · {memberStats.upcomingHostedCount} upcoming
            </p>
          </article>
        ) : null}
      </section>

      <section className={styles.grid}>
        <article className={`${styles.card} internal-card`}>
          <h2>Dues Snapshot</h2>
          {dashboard.dues.enabled ? (
            dashboard.dues.openInvoices.length > 0 ? (
              <ul className={styles.list}>
                {dashboard.dues.openInvoices.map((invoice) => (
                  <li key={invoice.id}>
                    <strong>{invoice.label}</strong>
                    <p>
                      {formatMoney(invoice.amountCents, invoice.currency)} · due {invoice.dueDate}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No open dues invoices.</p>
            )
          ) : (
            <p>Dues module is currently disabled.</p>
          )}
          <Link href="/account/dues" className={styles.inlineLink}>
            Open dues page
          </Link>
        </article>

        <article className={`${styles.card} internal-card`}>
          <h2>Upcoming Events</h2>
          {dashboard.events.enabled ? (
            dashboard.events.upcomingRegistrations.length > 0 ? (
              <ul className={styles.list}>
                {dashboard.events.upcomingRegistrations.map((registration) => (
                  <li key={registration.id}>
                    <strong>{registration.eventTitle}</strong>
                    <p>
                      {registration.status}
                      {registration.eventStartAt ? ` · ${new Date(registration.eventStartAt).toLocaleString()}` : ""}
                    </p>
                    <Link href={registration.eventPath} className={styles.inlineLink}>
                      View event
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No upcoming registrations yet.</p>
            )
          ) : (
            <p>Event signups are currently disabled.</p>
          )}
        </article>

        <article className={`${styles.card} internal-card`}>
          <h2>Suggested Events</h2>
          {dashboard.events.suggestedEvents.length > 0 ? (
            <ul className={styles.list}>
              {dashboard.events.suggestedEvents.map((event) => (
                <li key={event.id}>
                  <strong>{event.title}</strong>
                  <p>{event.startAt ? new Date(event.startAt).toLocaleString() : "Date TBD"}</p>
                  <Link href={event.path} className={styles.inlineLink}>
                    View event
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>No suggested events at this time.</p>
          )}
        </article>

        <article className={`${styles.card} internal-card`}>
          <h2>Activity Feed</h2>
          {dashboard.activity.length > 0 ? (
            <ul className={styles.list}>
              {dashboard.activity.map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.label}</strong>
                  <p>{new Date(entry.timestamp).toLocaleString()}</p>
                  {entry.href ? (
                    <Link href={entry.href} className={styles.inlineLink}>
                      Open
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p>No recent activity yet.</p>
          )}
        </article>

        <article className={`${styles.card} internal-card`}>
          <h2>Community Updates</h2>
          {dashboard.announcements.length > 0 ? (
            <ul className={styles.list}>
              {dashboard.announcements.map((announcement) => (
                <li key={announcement.id}>
                  <strong>{announcement.title}</strong>
                  <p>
                    {announcement.publication}
                    {announcement.publishedLabel ? ` · ${announcement.publishedLabel}` : ""}
                  </p>
                  <Link href={announcement.path} className={styles.inlineLink}>
                    Read
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>No announcements available.</p>
          )}
        </article>
      </section>
    </main>
  );
}
