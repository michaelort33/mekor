import Link from "next/link";
import type { ReactNode } from "react";

import { AdminLogoutButton } from "@/components/admin/logout-button";
import { AreaSwitcher } from "@/components/navigation/area-switcher";
import {
  BackendPageHeader,
  BackendShell,
  type BackendNavSection,
} from "@/components/backend/shell/backend-shell";
import { StatGrid, StatTile } from "@/components/backend/ui/stats";

export type AdminRouteItem = {
  href: string;
  label: string;
  section?: "workspace" | "crm" | "finance" | "communication" | "ops";
};

export const ADMIN_ROUTES: AdminRouteItem[] = [
  { href: "/admin", label: "Dashboard", section: "workspace" },
  { href: "/admin/membership-applications", label: "Applications", section: "crm" },
  { href: "/admin/people", label: "People", section: "crm" },
  { href: "/admin/users", label: "Users", section: "crm" },
  { href: "/admin/campaigns", label: "Campaigns", section: "finance" },
  { href: "/admin/payments", label: "Payments", section: "finance" },
  { href: "/admin/dues", label: "Dues", section: "finance" },
  { href: "/admin/invitations", label: "Invitations", section: "communication" },
  { href: "/admin/messages", label: "Messages", section: "communication" },
  { href: "/admin/ask-mekor", label: "Ask Mekor", section: "communication" },
  { href: "/admin/templates", label: "Templates", section: "communication" },
  { href: "/admin/events", label: "Events", section: "ops" },
  { href: "/admin/audit", label: "Audit log", section: "ops" },
  { href: "/admin/settings", label: "Settings", section: "ops" },
];

const SECTION_ORDER: Array<{ key: NonNullable<AdminRouteItem["section"]>; label: string }> = [
  { key: "workspace", label: "Workspace" },
  { key: "crm", label: "People" },
  { key: "finance", label: "Finance" },
  { key: "communication", label: "Communication" },
  { key: "ops", label: "Operations" },
];

function buildNavSections(): BackendNavSection[] {
  return SECTION_ORDER.map((section) => ({
    label: section.label,
    items: ADMIN_ROUTES.filter((r) => r.section === section.key).map((r) => ({
      href: r.href,
      label: r.label,
      matchPrefix: r.href !== "/admin",
    })),
  })).filter((s) => s.items.length > 0);
}

export type AdminBreadcrumb = {
  href?: string;
  label: string;
};

export type AdminStat = {
  label: string;
  value: string;
  hint?: string;
};

function buildDefaultBreadcrumbs(currentPath: string, title: string): AdminBreadcrumb[] {
  if (currentPath === "/admin") return [{ label: "Dashboard" }];
  const route = ADMIN_ROUTES.find(
    (item) =>
      item.href !== "/admin" &&
      (currentPath === item.href || currentPath.startsWith(`${item.href}/`)),
  );
  return [
    { href: "/admin", label: "Dashboard" },
    { label: route?.label ?? title },
  ];
}

export function AdminShell({
  currentPath,
  title,
  description,
  eyebrow = "Admin Workspace",
  breadcrumbs,
  actions,
  stats,
  children,
}: {
  currentPath: string;
  title: string;
  description?: string;
  eyebrow?: string;
  breadcrumbs?: AdminBreadcrumb[];
  actions?: ReactNode;
  stats?: AdminStat[];
  children: ReactNode;
}) {
  const trail = breadcrumbs ?? buildDefaultBreadcrumbs(currentPath, title);

  return (
    <BackendShell
      brand={<Link href="/admin" style={{ textDecoration: "none", color: "inherit" }}>Mekor Admin</Link>}
      sections={buildNavSections()}
      footer={
        <>
          <AreaSwitcher currentPath={currentPath} currentArea="admin" variant="compact" />
          <AdminLogoutButton />
        </>
      }
      crumbs={trail}
      topActions={actions}
    >
      <BackendPageHeader eyebrow={eyebrow} title={title} description={description} />
      {stats?.length ? (
        <StatGrid>
          {stats.map((stat) => (
            <StatTile key={stat.label} label={stat.label} value={stat.value} hint={stat.hint} />
          ))}
        </StatGrid>
      ) : null}
      {children}
    </BackendShell>
  );
}
