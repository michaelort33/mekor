import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import adminStyles from "@/components/admin/admin-shell.module.css";
import { SubscribersClient } from "./subscribers-client";

export const dynamic = "force-dynamic";

export default function NewsletterSubscribersPage() {
  return (
    <AdminShell
      currentPath="/admin/templates"
      title="Newsletter Subscribers"
      description="View confirmation state, delivery health, and subscription status for the canonical newsletter audience."
      breadcrumbs={[{ href: "/admin", label: "Dashboard" }, { href: "/admin/templates", label: "Newsletters" }, { label: "Subscribers" }]}
      actions={<Link href="/admin/templates" className={adminStyles.actionPill}>Back to newsletters</Link>}
    >
      <SubscribersClient />
    </AdminShell>
  );
}
