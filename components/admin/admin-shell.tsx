import Link from "next/link";
import type { ReactNode } from "react";

import { AdminLogoutButton } from "@/components/admin/logout-button";
import { AreaSwitcher } from "@/components/navigation/area-switcher";
import styles from "./admin-shell.module.css";

export type AdminRouteItem = {
  href: string;
  label: string;
};

export const ADMIN_ROUTES: AdminRouteItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/membership-applications", label: "Applications" },
  { href: "/admin/people", label: "People" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/campaigns", label: "Campaigns" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/invitations", label: "Invitations" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/ask-mekor", label: "Ask Mekor" },
  { href: "/admin/dues", label: "Dues" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/templates", label: "Templates" },
  { href: "/admin/settings", label: "Settings" },
];

export type AdminBreadcrumb = {
  href?: string;
  label: string;
};

export type AdminStat = {
  label: string;
  value: string;
  hint?: string;
};

function isRouteActive(currentPath: string, href: string) {
  if (href === "/admin") return currentPath === href;
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function buildDefaultBreadcrumbs(currentPath: string, title: string): AdminBreadcrumb[] {
  if (currentPath === "/admin") return [{ label: "Dashboard" }];
  const route = ADMIN_ROUTES.find((item) => isRouteActive(currentPath, item.href) && item.href !== "/admin");
  if (!route) return [{ href: "/admin", label: "Dashboard" }, { label: title }];
  return [{ href: "/admin", label: "Dashboard" }, { label: route.label }];
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
    <main className={`internal-page ${styles.shell}`}>
      <section className={styles.headerCard}>
        <div className={styles.headerMeta}>
          <div className={styles.breadcrumbs} aria-label="Breadcrumbs">
            {trail.map((item, index) => (
              <span key={`${item.label}-${index}`} className={item.href ? styles.breadcrumbLink : styles.breadcrumbCurrent}>
                {item.href ? <Link href={item.href}>{item.label}</Link> : item.label}
                {index < trail.length - 1 ? <span className={styles.breadcrumbSeparator}>/</span> : null}
              </span>
            ))}
          </div>
          <AreaSwitcher currentPath={currentPath} currentArea="admin" variant="compact" />
        </div>

        <div className={styles.headerMain}>
          <div className={styles.headerCopy}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1 className={styles.title}>{title}</h1>
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>
          <div className={styles.headerActions}>
            {actions}
            <AdminLogoutButton className={styles.actionPill} />
          </div>
        </div>

        <nav className={styles.nav} aria-label="Admin navigation">
          {ADMIN_ROUTES.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isRouteActive(currentPath, item.href) ? styles.navLinkActive : styles.navLink}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </section>

      {stats?.length ? (
        <section className={styles.statsGrid} aria-label="Page summary">
          {stats.map((stat) => (
            <article key={stat.label}>
              <p className={styles.statLabel}>{stat.label}</p>
              <p className={styles.statValue}>{stat.value}</p>
              {stat.hint ? <p className={styles.statHint}>{stat.hint}</p> : null}
            </article>
          ))}
        </section>
      ) : null}

      {children}
    </main>
  );
}
