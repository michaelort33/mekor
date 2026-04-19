"use client";

import Link from "next/link";

import { ADMIN_ROUTES } from "@/components/admin/admin-shell";
import { DataState } from "@/components/backend/data/data-state";
import { fetchJson, useResource } from "@/components/backend/data/use-resource";
import { Card, CardBody, CardHeader } from "@/components/backend/ui/card";
import { StatGrid, StatTile } from "@/components/backend/ui/stats";

import type { AdminDashboardKpis } from "@/app/api/admin/dashboard/route";

const DESCRIPTIONS: Record<string, string> = {
  "/admin/membership-applications": "Review membership applications and approve applicants.",
  "/admin/people": "Search leads and members; update CRM records.",
  "/admin/users": "Adjust account roles, visibility, and renewal dates.",
  "/admin/campaigns": "Create fundraising campaigns and track active appeals.",
  "/admin/payments": "Reconcile multi-source payments and tax reporting.",
  "/admin/invitations": "Send onboarding links; track and revoke invites.",
  "/admin/messages": "Run quick campaigns and review delivery history.",
  "/admin/ask-mekor": "Triage public and private Ask Mekor questions.",
  "/admin/dues": "Manage dues schedules, invoices, balances, and actions.",
  "/admin/events": "Review event registrations and signup settings.",
  "/admin/templates": "Author, preview, and send newsletter templates.",
  "/admin/settings": "Manage system flags and admin-only configuration.",
};

function dollars(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    cents / 100,
  );
}

function compact(n: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function AdminDashboardClient() {
  const resource = useResource<AdminDashboardKpis>(
    (signal) => fetchJson<AdminDashboardKpis>("/api/admin/dashboard", { signal }),
    [],
    { pollMs: 60_000 },
  );

  const routes = ADMIN_ROUTES.filter((item) => item.href !== "/admin");

  return (
    <>
      <DataState resource={resource}>
        {(kpis) => (
          <StatGrid>
            <StatTile
              label="People in CRM"
              value={compact(kpis.people.total)}
              hint={`${kpis.people.members} members · ${kpis.people.leads} leads`}
              tone="accent"
              delta={
                kpis.people.addedLast30d > 0
                  ? { value: `+${kpis.people.addedLast30d} (30d)`, direction: "up" }
                  : undefined
              }
            />
            <StatTile
              label="Pending applications"
              value={String(kpis.applications.pending)}
              hint="Awaiting admin review"
              tone={kpis.applications.pending > 0 ? "warning" : "success"}
            />
            <StatTile
              label="Open dues"
              value={dollars(kpis.dues.openCents)}
              hint={`${kpis.dues.openCount} invoices · ${kpis.dues.overdueCount} overdue`}
              tone={kpis.dues.overdueCount > 0 ? "danger" : "info"}
            />
            <StatTile
              label="Payments — last 30d"
              value={dollars(kpis.payments.last30dCents)}
              hint={`${kpis.payments.last30dCount} successful charges`}
              tone="success"
            />
            <StatTile
              label="Outstanding invitations"
              value={String(kpis.invitations.outstanding)}
              hint="Not yet accepted or revoked"
              tone="info"
            />
            <StatTile
              label="Admin actions — 7d"
              value={String(kpis.audit.last7dCount)}
              hint="Audited admin operations"
              tone="neutral"
            />
          </StatGrid>
        )}
      </DataState>

      <section
        style={{
          display: "grid",
          gap: "var(--bk-space-3)",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        {routes.map((route) => (
          <Card key={route.href}>
            <CardHeader title={route.label} />
            <CardBody dense>
              <p style={{ margin: 0, color: "var(--bk-text-soft)", fontSize: "var(--bk-text-sm)" }}>
                {DESCRIPTIONS[route.href] ?? "Open this admin area."}
              </p>
              <p style={{ margin: "var(--bk-space-3) 0 0" }}>
                <Link
                  href={route.href}
                  style={{
                    color: "var(--bk-accent-strong)",
                    textDecoration: "none",
                    fontWeight: 700,
                    fontSize: "var(--bk-text-sm)",
                  }}
                >
                  Open {route.label} →
                </Link>
              </p>
            </CardBody>
          </Card>
        ))}
      </section>
    </>
  );
}
