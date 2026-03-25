import type { ReactNode } from "react";

import { MembersBreadcrumbs, type BreadcrumbItem, type MembersNavSection } from "@/components/members/members-breadcrumbs";
import styles from "./member-shell.module.css";

export type MemberStat = {
  label: string;
  value: string;
  hint?: string;
};

export function MemberShell({
  title,
  description,
  eyebrow = "Members Area",
  navigationContext = "member",
  breadcrumbs,
  activeSection,
  actions,
  stats,
  children,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  navigationContext?: "member" | "authenticated";
  breadcrumbs: BreadcrumbItem[];
  activeSection: MembersNavSection;
  actions?: ReactNode;
  stats?: MemberStat[];
  children: ReactNode;
}) {
  return (
    <main className={`internal-page ${styles.shell}`}>
      <MembersBreadcrumbs items={breadcrumbs} context={navigationContext} activeSection={activeSection} />

      <section className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1 className={styles.title}>{title}</h1>
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </div>
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
