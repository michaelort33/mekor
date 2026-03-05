import Link from "next/link";

import { ADMIN_ROUTES, AdminShell } from "@/components/admin/admin-shell";
import styles from "./page.module.css";

const DESCRIPTIONS: Record<string, string> = {
  "/admin/membership-applications": "Review hosted membership applications and approve applicants into the member flow.",
  "/admin/people": "Search leads and members, update records, and open individual profiles.",
  "/admin/users": "Adjust account roles, visibility, renewal dates, and automation settings.",
  "/admin/invitations": "Send onboarding links, track status, and resend or revoke invites.",
  "/admin/messages": "Run quick campaigns and review delivery history in one place.",
  "/admin/dues": "Manage schedules, invoices, balances, and manual dues actions.",
  "/admin/events": "Review registrations and control event signup settings.",
  "/admin/templates": "Create, edit, preview, and send newsletter templates.",
  "/admin/settings": "Manage system flags and admin-only configuration.",
};

export default function AdminDashboardPage() {
  const routes = ADMIN_ROUTES.filter((item) => item.href !== "/admin");

  return (
    <AdminShell
      currentPath="/admin"
      title="Admin Dashboard"
      description="One place to jump between CRM, operations, messaging, and settings without hunting through scattered links."
      stats={[
        { label: "Workflows", value: String(routes.length), hint: "Core admin sections" },
        { label: "Fastest path", value: "People", hint: "CRM is the default starting point" },
        { label: "High-risk area", value: "Settings", hint: "Super admin only" },
      ]}
    >
      <section className={styles.grid}>
        {routes.map((route) => (
          <article key={route.href} className={styles.card}>
            <h2>{route.label}</h2>
            <p>{DESCRIPTIONS[route.href] ?? "Open this admin area."}</p>
            <Link href={route.href} className={styles.link}>
              Open {route.label}
            </Link>
          </article>
        ))}
      </section>
    </AdminShell>
  );
}
