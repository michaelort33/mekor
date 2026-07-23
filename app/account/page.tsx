"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

import { AccountShell } from "@/components/account/account-shell";
import { Badge, type BadgeTone } from "@/components/backend/ui/badge";
import { Button } from "@/components/backend/ui/button";
import { Card, CardBody, CardHeader } from "@/components/backend/ui/card";
import { DataState } from "@/components/backend/data/data-state";
import { fetchJson, useResource } from "@/components/backend/data/use-resource";

type DashboardResponse = {
  summary: {
    displayName: string;
    role: "visitor" | "member" | "admin" | "super_admin";
    accessState: "approved_member" | "pending_approval" | "declined" | "visitor";
    canAccessMembersArea: boolean;
    latestMembershipApplicationStatus: "pending" | "approved" | "declined" | null;
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

type MemberStatsResponse = {
  stats?: {
    eventsHostedCount: number;
    approvedAttendeesTotal: number;
    uniqueAttendeesCount: number;
    upcomingHostedCount: number;
    attendanceRate: number;
  };
};

const REGISTRATION_TONES: Record<DashboardResponse["events"]["upcomingRegistrations"][number]["status"], BadgeTone> = {
  registered: "success",
  waitlisted: "warning",
  cancelled: "neutral",
  payment_pending: "info",
};

const INVOICE_TONES: Record<DashboardResponse["dues"]["openInvoices"][number]["status"], BadgeTone> = {
  open: "info",
  overdue: "warning",
  paid: "success",
  void: "neutral",
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

const cardListStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: "var(--bk-space-3)",
};

const cardItemStyle: React.CSSProperties = {
  display: "grid",
  gap: "var(--bk-space-1)",
  padding: "var(--bk-space-3)",
  borderRadius: "var(--bk-radius-md)",
  background: "var(--bk-surface-soft)",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gap: "var(--bk-space-4)",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  marginTop: "var(--bk-space-4)",
};

export default function AccountDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justApplied = searchParams.get("membership") === "pending";

  const dashboard = useResource<DashboardResponse>(
    (signal) => fetchJson<DashboardResponse>("/api/account/dashboard", { signal }),
    [],
  );
  const memberStats = useResource<MemberStatsResponse>(
    (signal) => fetchJson<MemberStatsResponse>("/api/account/member-stats", { signal }),
    [],
  );

  useEffect(() => {
    if (dashboard.error?.toLowerCase().includes("unauth") || dashboard.error?.includes("401")) {
      router.replace("/login?next=/account");
    }
  }, [dashboard.error, router]);

  const data = dashboard.data;
  const stats = data?.summary;
  const hasMemberAccess = !!stats?.canAccessMembersArea;
  const totalRecentPayments = useMemo(
    () => data?.dues.recentPayments.reduce((sum, p) => sum + p.amountCents, 0) ?? 0,
    [data],
  );

  const shellStats = data
    ? hasMemberAccess
      ? [
          {
            label: "Amount due",
            value: formatMoney(data.summary.totalDueCents, "usd"),
            hint: `${data.summary.openInvoicesCount} open invoice(s)`,
          },
          {
            label: "Upcoming events",
            value: String(data.summary.upcomingRegistrationsCount),
            hint: "On your calendar",
          },
          {
            label: "Recent payments",
            value: formatMoney(totalRecentPayments, "usd"),
            hint: "Across latest activity",
          },
          {
            label: "Membership",
            value: data.summary.role,
            hint: data.summary.lastLoginAt
              ? `Last sign-in ${new Date(data.summary.lastLoginAt).toLocaleDateString()}`
              : "Welcome",
          },
        ]
      : [
          {
            label: "Status",
            value: data.summary.accessState.replace("_", " "),
            hint: "Member tools unlock after approval",
          },
          {
            label: "Profile visibility",
            value: data.summary.profileVisibility,
            hint: "Adjust in profile",
          },
          {
            label: "Application",
            value: data.summary.latestMembershipApplicationStatus ?? "none",
            hint: "Latest membership review",
          },
        ]
    : [];

  const heroTitle = data ? `Welcome, ${data.summary.displayName}` : "Welcome";
  const heroDescription = hasMemberAccess
    ? "Find members, message neighbors, track dues, and stay on top of community life."
    : stats?.accessState === "pending_approval"
      ? "Manage your account while your membership application is being reviewed."
      : stats?.accessState === "declined"
        ? "Manage your account and follow up with Mekor leadership about membership."
        : "Your account is active. Manage your profile here; member features unlock after approval.";

  const visibilityLabel =
    data?.summary.profileVisibility === "private"
      ? "Hidden from the directory"
      : data?.summary.profileVisibility === "anonymous"
        ? "Listed anonymously"
        : data?.summary.profileVisibility === "public"
          ? "Visible publicly"
          : "Visible to members";

  return (
    <AccountShell
      currentPath="/account"
      title={heroTitle}
      description={heroDescription}
      eyebrow={hasMemberAccess ? "Members Area" : "Account"}
      stats={shellStats}
      membersAreaEnabled={hasMemberAccess}
      actions={
        <>
          {hasMemberAccess ? (
            <>
              <Link href="/members">
                <Button size="sm">Find members</Button>
              </Link>
              <Link href="/account/inbox">
                <Button size="sm" variant="ghost">Inbox</Button>
              </Link>
            </>
          ) : null}
          <Link href="/account/profile">
            <Button size="sm" variant="ghost">Profile</Button>
          </Link>
        </>
      }
    >
      <DataState resource={dashboard} empty={{ title: "Dashboard unavailable", description: "We couldn't load your account data." }}>
        {(d) => (
          <>
            {!hasMemberAccess ? (
              <Card padded style={{ marginTop: "var(--bk-space-4)" }}>
                <CardHeader
                  title={
                    justApplied || d.summary.accessState === "pending_approval"
                      ? justApplied
                        ? "Application received — thanks for applying"
                        : "Your account is pending member approval"
                      : d.summary.accessState === "declined"
                        ? "Your membership application needs follow-up"
                        : "Your account is active"
                  }
                  description={
                    justApplied || d.summary.accessState === "pending_approval"
                      ? justApplied
                        ? "Your application is in Mekor's review queue. You can update your profile now; member tools unlock after approval."
                        : "We're reviewing your application. You can update your profile while we work."
                      : d.summary.accessState === "declined"
                        ? "Reach out to Mekor leadership if you'd like to reapply."
                        : "Member tools unlock once approval is complete. If you haven't applied yet, start a membership application."
                  }
                  actions={
                    <>
                      <Link href="/account/profile">
                        <Button size="sm">Update profile</Button>
                      </Link>
                      {d.summary.accessState === "visitor" && !justApplied ? (
                        <Link href="/membership/apply">
                          <Button size="sm" variant="secondary">
                            Apply for membership
                          </Button>
                        </Link>
                      ) : null}
                    </>
                  }
                />
              </Card>
            ) : (
              <>
              <section
                aria-labelledby="community-hub-title"
                style={{
                  marginTop: "var(--bk-space-5)",
                  padding: "var(--bk-space-5)",
                  border: "1px solid var(--bk-border)",
                  borderRadius: "var(--bk-radius-lg)",
                  background: "var(--bk-surface)",
                  display: "grid",
                  gap: "var(--bk-space-4)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ maxWidth: "56ch" }}>
                    <h2
                      id="community-hub-title"
                      style={{
                        margin: 0,
                        fontFamily: "var(--bk-font-heading)",
                        fontSize: "var(--bk-text-xl)",
                        color: "var(--bk-text)",
                      }}
                    >
                      Community
                    </h2>
                    <p style={{ margin: "6px 0 0", color: "var(--bk-text-soft)", lineHeight: 1.55 }}>
                      Discover neighbors who opted into the directory, message them in your inbox,
                      and manage how you appear.
                    </p>
                  </div>
                  <p style={{ margin: 0, fontSize: "var(--bk-text-sm)", color: "var(--bk-text-soft)" }}>
                    Your listing: <strong style={{ color: "var(--bk-text)" }}>{visibilityLabel}</strong>
                  </p>
                </div>
                <ul
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    display: "grid",
                    gap: "var(--bk-space-3)",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  }}
                >
                  {[
                    {
                      href: "/members",
                      title: "Find members",
                      description: "Search the directory and open profiles.",
                    },
                    {
                      href: "/account/inbox",
                      title: "Inbox",
                      description: "Direct messages, family invites, and event requests.",
                    },
                    {
                      href: "/account/family",
                      title: "Family",
                      description: "Household members and invites.",
                    },
                    {
                      href: "/account/member-events",
                      title: "Host events",
                      description: "Create gatherings and review join requests.",
                    },
                    {
                      href: "/account/profile#directory-visibility",
                      title: "Visibility settings",
                      description: "Choose who can see you in the directory.",
                    },
                    {
                      href: "/community",
                      title: "Public directory",
                      description: "Profiles marked public for the wider community.",
                    },
                  ].map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        style={{
                          display: "grid",
                          gap: 4,
                          textDecoration: "none",
                          padding: "var(--bk-space-3)",
                          borderRadius: "var(--bk-radius-md)",
                          background: "var(--bk-surface-soft)",
                          border: "1px solid transparent",
                          minHeight: 88,
                          transition: "border-color 180ms cubic-bezier(0.22, 1, 0.36, 1), background 180ms cubic-bezier(0.22, 1, 0.36, 1)",
                        }}
                      >
                        <strong style={{ color: "var(--bk-text)", fontSize: "var(--bk-text-sm)" }}>
                          {item.title}
                        </strong>
                        <span style={{ color: "var(--bk-text-soft)", fontSize: "var(--bk-text-xs)", lineHeight: 1.45 }}>
                          {item.description}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              <div style={gridStyle}>
                <Card padded>
                  <CardHeader
                    title="Open dues"
                    description={d.dues.enabled ? `${d.dues.openInvoices.length} pending` : "Disabled"}
                    actions={
                      <Link href="/account/dues">
                        <Button size="sm" variant="ghost">Open</Button>
                      </Link>
                    }
                  />
                  <CardBody>
                    {d.dues.enabled ? (
                      d.dues.openInvoices.length > 0 ? (
                        <ul style={cardListStyle}>
                          {d.dues.openInvoices.slice(0, 4).map((invoice) => (
                            <li key={invoice.id} style={cardItemStyle}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                <strong>{invoice.label}</strong>
                                <Badge tone={INVOICE_TONES[invoice.status]}>{invoice.status}</Badge>
                              </div>
                              <span style={{ fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)" }}>
                                {formatMoney(invoice.amountCents, invoice.currency)} · due {invoice.dueDate}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ color: "var(--bk-text-soft)" }}>No open dues invoices.</p>
                      )
                    ) : (
                      <p style={{ color: "var(--bk-text-soft)" }}>Dues module is disabled.</p>
                    )}
                  </CardBody>
                </Card>

                <Card padded>
                  <CardHeader
                    title="Upcoming events"
                    description={d.events.enabled ? `${d.events.upcomingRegistrations.length} registered` : "Disabled"}
                    actions={
                      <Link href="/events">
                        <Button size="sm" variant="ghost">Browse</Button>
                      </Link>
                    }
                  />
                  <CardBody>
                    {d.events.enabled ? (
                      d.events.upcomingRegistrations.length > 0 ? (
                        <ul style={cardListStyle}>
                          {d.events.upcomingRegistrations.slice(0, 4).map((reg) => (
                            <li key={reg.id} style={cardItemStyle}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                                <strong>{reg.eventTitle}</strong>
                                <Badge tone={REGISTRATION_TONES[reg.status]}>{reg.status.replace("_", " ")}</Badge>
                              </div>
                              <span style={{ fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)" }}>
                                {reg.eventStartAt ? new Date(reg.eventStartAt).toLocaleString() : "Date TBD"}
                              </span>
                              <Link href={reg.eventPath} style={{ fontSize: "var(--bk-text-xs)" }}>View event →</Link>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ color: "var(--bk-text-soft)" }}>No upcoming registrations yet.</p>
                      )
                    ) : (
                      <p style={{ color: "var(--bk-text-soft)" }}>Event signups are disabled.</p>
                    )}
                  </CardBody>
                </Card>

                <Card padded>
                  <CardHeader title="Suggested events" />
                  <CardBody>
                    {d.events.suggestedEvents.length > 0 ? (
                      <ul style={cardListStyle}>
                        {d.events.suggestedEvents.slice(0, 4).map((event) => (
                          <li key={event.id} style={cardItemStyle}>
                            <strong>{event.title}</strong>
                            <span style={{ fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)" }}>
                              {event.startAt ? new Date(event.startAt).toLocaleString() : "Date TBD"}
                              {event.location ? ` · ${event.location}` : ""}
                            </span>
                            <Link href={event.path} style={{ fontSize: "var(--bk-text-xs)" }}>View event →</Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ color: "var(--bk-text-soft)" }}>Nothing suggested right now.</p>
                    )}
                  </CardBody>
                </Card>

                <Card padded>
                  <CardHeader title="Recent activity" />
                  <CardBody>
                    {d.activity.length > 0 ? (
                      <ul style={cardListStyle}>
                        {d.activity.slice(0, 6).map((entry) => (
                          <li key={entry.id} style={cardItemStyle}>
                            <strong>{entry.label}</strong>
                            <span style={{ fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)" }}>
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                            {entry.href ? (
                              <Link href={entry.href} style={{ fontSize: "var(--bk-text-xs)" }}>Open →</Link>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ color: "var(--bk-text-soft)" }}>No recent activity yet.</p>
                    )}
                  </CardBody>
                </Card>

                <Card padded>
                  <CardHeader title="Community updates" />
                  <CardBody>
                    {d.announcements.length > 0 ? (
                      <ul style={cardListStyle}>
                        {d.announcements.slice(0, 4).map((announcement) => (
                          <li key={announcement.id} style={cardItemStyle}>
                            <strong>{announcement.title}</strong>
                            <span style={{ fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)" }}>
                              {announcement.publication}
                              {announcement.publishedLabel ? ` · ${announcement.publishedLabel}` : ""}
                            </span>
                            <Link href={announcement.path} style={{ fontSize: "var(--bk-text-xs)" }}>Read →</Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ color: "var(--bk-text-soft)" }}>No announcements yet.</p>
                    )}
                  </CardBody>
                </Card>

                {memberStats.data?.stats ? (
                  <Card padded>
                    <CardHeader
                      title="Hosting stats"
                      description="Your impact as an event host"
                      actions={
                        <Link href="/account/member-events">
                          <Button size="sm" variant="ghost">Manage</Button>
                        </Link>
                      }
                    />
                    <CardBody>
                      <div style={{ display: "grid", gap: "var(--bk-space-2)" }}>
                        <div>
                          <strong>{memberStats.data.stats.eventsHostedCount}</strong> events hosted
                        </div>
                        <div>
                          <strong>{memberStats.data.stats.approvedAttendeesTotal}</strong> approved attendees
                        </div>
                        <div>
                          <strong>{memberStats.data.stats.upcomingHostedCount}</strong> upcoming
                        </div>
                        <div style={{ color: "var(--bk-text-soft)", fontSize: "var(--bk-text-xs)" }}>
                          {Math.round(memberStats.data.stats.attendanceRate * 100)}% attendance rate
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ) : null}
              </div>
              </>
            )}
          </>
        )}
      </DataState>
    </AccountShell>
  );
}
