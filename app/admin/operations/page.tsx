import Link from "next/link";

import { AdminLogoutButton } from "@/components/admin/logout-button";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { OperationsTools } from "@/components/admin/operations-tools";
import { getDashboardSummary } from "@/lib/member-ops/dashboard";
import { isMemberOpsEnabled } from "@/lib/member-ops/feature";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function AdminOperationsPage() {
  const enabled = isMemberOpsEnabled();
  const summary = enabled ? await getDashboardSummary() : null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <h1 className={styles.heading}>Member Operations Dashboard</h1>
          <div className={styles.headerActions}>
            <AdminTabs current="operations" />
            <AdminLogoutButton />
          </div>
        </div>
        <p className={styles.subtitle}>
          Overdue dues, renewals, volunteer slots, RSVP exports, and member-connect moderation.
        </p>
      </header>

      {!enabled ? (
        <section className={styles.panel}>
          <h2>Feature flag disabled</h2>
          <p>Set <code>MEMBER_OPS_ENABLED=1</code> to enable the operations stack.</p>
        </section>
      ) : null}

      {enabled && summary ? (
        <>
          <section className={styles.panel}>
            <h2>Overdue Dues</h2>
            {summary.overdueHouseholds.length === 0 ? (
              <p>No overdue balances.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Household</th>
                    <th>Billing Email</th>
                    <th>Overdue</th>
                    <th>Oldest Due</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.overdueHouseholds.map((row) => (
                    <tr key={row.householdId}>
                      <td>{row.householdName}</td>
                      <td>{row.billingEmail || "—"}</td>
                      <td>${(row.overdueCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                      <td>{row.oldestDueDate ? new Date(row.oldestDueDate).toLocaleDateString("en-US") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className={styles.panel}>
            <h2>Renewal Status ({new Date().getUTCFullYear()} cycle)</h2>
            <div className={styles.kpiGrid}>
              {Object.entries(summary.renewalCounts).map(([status, count]) => (
                <article key={status} className={styles.kpiCard}>
                  <p>{status.replaceAll("_", " ")}</p>
                  <strong>{count}</strong>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <h2>Upcoming Events + RSVP Exports</h2>
            {summary.upcomingEvents.length === 0 ? (
              <p>No upcoming events in the next 30 days.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Start</th>
                    <th>RSVPs</th>
                    <th>Export</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.upcomingEvents.map((event) => (
                    <tr key={event.path}>
                      <td>
                        <Link href={event.path}>{event.title}</Link>
                      </td>
                      <td>{event.startAt ? new Date(event.startAt).toLocaleString("en-US") : "—"}</td>
                      <td>{event.rsvpCount}</td>
                      <td>
                        <a href={`/api/admin/events/rsvps-export.csv?eventPath=${encodeURIComponent(event.path)}`}>
                          CSV
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className={styles.panel}>
            <h2>Volunteer Slot Occupancy</h2>
            {summary.volunteerSlotStats.length === 0 ? (
              <p>No upcoming volunteer slots.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Slot</th>
                    <th>Start</th>
                    <th>Confirmed</th>
                    <th>Waitlisted</th>
                    <th>Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.volunteerSlotStats.map((slot) => (
                    <tr key={slot.slotId}>
                      <td>{slot.label}</td>
                      <td>{new Date(slot.startAt).toLocaleString("en-US")}</td>
                      <td>{slot.confirmedCount}</td>
                      <td>{slot.waitlistedCount}</td>
                      <td>{slot.capacity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <div className={styles.toolsWrap}>
            <OperationsTools
              pendingRequests={summary.pendingMessageRequests.map((row) => ({
                ...row,
                createdAt: row.createdAt.toISOString(),
              }))}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
