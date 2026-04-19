"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import styles from "./backend-shell.module.css";

export type BackendNavItem = {
  href: string;
  label: ReactNode;
  icon?: ReactNode;
  /** When true, the link is considered active for any path that starts with `href`. */
  matchPrefix?: boolean;
};

export type BackendNavSection = {
  label?: ReactNode;
  items: BackendNavItem[];
};

export type BackendCrumb = { href?: string; label: ReactNode };

export type BackendShellProps = {
  brand: ReactNode;
  sections: BackendNavSection[];
  footer?: ReactNode;
  topActions?: ReactNode;
  crumbs?: BackendCrumb[];
  children: ReactNode;
};

export function BackendShell({
  brand,
  sections,
  footer,
  topActions,
  crumbs,
  children,
}: BackendShellProps) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className={styles.layout}>
      {open ? <div className={styles.scrim} onClick={() => setOpen(false)} /> : null}
      <aside className={`${styles.sidebar} ${open ? styles.open : ""}`}>
        <div className={styles.sidebarBrand}>{brand}</div>
        {sections.map((section, idx) => (
          <div key={idx} className={styles.sidebarSection}>
            {section.label ? <div className={styles.sidebarLabel}>{section.label}</div> : null}
            {section.items.map((item) => {
              const active = item.matchPrefix
                ? pathname === item.href || pathname.startsWith(`${item.href}/`)
                : pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.sidebarLink} ${active ? styles.active : ""}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
        {footer ? <div className={styles.sidebarFooter}>{footer}</div> : null}
      </aside>
      <div className={styles.main}>
        <div className={styles.topBar}>
          <div className={styles.crumbs}>
            <button
              type="button"
              className={styles.menuButton}
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              ☰
            </button>
            {crumbs?.map((crumb, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                {i > 0 ? <span className={styles.crumbsSep}>/</span> : null}
                {crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : <span>{crumb.label}</span>}
              </span>
            ))}
          </div>
          {topActions ? <div className={styles.topActions}>{topActions}</div> : null}
        </div>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

export type BackendPageHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

export function BackendPageHeader({ eyebrow, title, description, actions }: BackendPageHeaderProps) {
  return (
    <header className={styles.pageHeader}>
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      <h1 className={styles.pageTitle}>{title}</h1>
      {description ? <p className={styles.pageDescription}>{description}</p> : null}
      {actions ? <div className={styles.pageActions}>{actions}</div> : null}
    </header>
  );
}
