import { AdminShell } from "@/components/admin/admin-shell";

import { AdminDashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  return (
    <AdminShell
      currentPath="/admin"
      title="Admin Dashboard"
      description="Live KPIs across CRM, dues, payments, applications, and admin activity."
    >
      <AdminDashboardClient />
    </AdminShell>
  );
}
