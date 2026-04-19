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

export type AccountRouteItem = {
  href: string;
  label: string;
  section?: "overview" | "finance" | "community" | "settings";
  membersOnly?: boolean;
};

export const ACCOUNT_ROUTES: AccountRouteItem[] = [
  { href: "/account", label: "Dashboard", section: "overview" },
  { href: "/account/profile", label: "Profile", section: "overview" },
  { href: "/account/dues", label: "Dues", section: "finance", membersOnly: true },
  { href: "/account/payments", label: "Payments", section: "finance", membersOnly: true },
  { href: "/account/family", label: "Family", section: "community", membersOnly: true },
  { href: "/account/member-events", label: "Host events", section: "community", membersOnly: true },
  { href: "/account/inbox", label: "Inbox", section: "community", membersOnly: true },
  { href: "/account/security", label: "Security", section: "settings" },
  { href: "/account/notifications", label: "Notifications", section: "settings" },
  { href: "/account/delete", label: "Delete account", section: "settings" },
];

const SECTION_ORDER: Array<{ key: NonNullable<AccountRouteItem["section"]>; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "finance", label: "Finance" },
  { key: "community", label: "Community" },
  { key: "settings", label: "Settings" },
];

function buildNavSections(membersAreaEnabled: boolean): BackendNavSection[] {
  return SECTION_ORDER.map((section) => ({
    label: section.label,
    items: ACCOUNT_ROUTES.filter((r) => r.section === section.key)
      .filter((r) => membersAreaEnabled || !r.membersOnly)
      .map((r) => ({
        href: r.href,
        label: r.label,
        matchPrefix: r.href !== "/account",
      })),
  })).filter((s) => s.items.length > 0);
}

export type AccountBreadcrumb = {
  href?: string;
  label: string;
};

export type AccountStat = {
  label: string;
  value: string;
  hint?: string;
};

function buildDefaultBreadcrumbs(currentPath: string, title: string): AccountBreadcrumb[] {
  if (currentPath === "/account") return [{ label: "Dashboard" }];
  const route = ACCOUNT_ROUTES.find(
    (item) =>
      item.href !== "/account" &&
      (currentPath === item.href || currentPath.startsWith(`${item.href}/`)),
  );
  return [
    { href: "/account", label: "Dashboard" },
    { label: route?.label ?? title },
  ];
}

export function AccountShell({
  currentPath,
  title,
  description,
  eyebrow = "Member Workspace",
  breadcrumbs,
  actions,
  stats,
  membersAreaEnabled = true,
  children,
}: {
  currentPath: string;
  title: string;
  description?: string;
  eyebrow?: string;
  breadcrumbs?: AccountBreadcrumb[];
  actions?: ReactNode;
  stats?: AccountStat[];
  membersAreaEnabled?: boolean;
  children: ReactNode;
}) {
  const trail = breadcrumbs ?? buildDefaultBreadcrumbs(currentPath, title);

  return (
    <BackendShell
      brand={
        <Link href="/account" style={{ textDecoration: "none", color: "inherit" }}>
          My Account
        </Link>
      }
      sections={buildNavSections(membersAreaEnabled)}
      footer={
        <>
          <AreaSwitcher currentPath={currentPath} currentArea="member" variant="compact" />
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
