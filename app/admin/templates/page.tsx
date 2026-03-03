import Link from "next/link";
import { desc } from "drizzle-orm";

import { getDb } from "@/db/client";
import { newsletterTemplates } from "@/db/schema";
import { AdminLogoutButton } from "@/components/admin/logout-button";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  ready: "Ready",
  sent: "Sent",
  archived: "Archived",
};

export default async function AdminTemplatesPage() {
  let templates: (typeof newsletterTemplates.$inferSelect)[] = [];

  if (process.env.DATABASE_URL) {
    templates = await getDb()
      .select()
      .from(newsletterTemplates)
      .orderBy(desc(newsletterTemplates.updatedAt));
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <h1 className={styles.heading}>Newsletter Templates</h1>
          <div className={styles.headerActions}>
            <Link href="/admin/dues" className={styles.actionLink}>
              Dues Admin
            </Link>
            <Link href="/admin/events" className={styles.actionLink}>
              Events Admin
            </Link>
            <Link href="/admin/users" className={styles.actionLink}>
              Manage Users
            </Link>
            <Link href="/admin/templates/new" className={styles.createButton}>
              + New Template
            </Link>
            <AdminLogoutButton />
          </div>
        </div>
        <p className={styles.subtitle}>
          Create and manage weekly newsletter email templates.
        </p>
      </header>

      {templates.length === 0 ? (
        <div className={styles.empty}>
          <p>No templates yet.</p>
          <Link href="/admin/templates/new" className={styles.createButton}>
            Create your first template
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {templates.map((template) => (
            <article key={template.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={`${styles.badge} ${styles[`badge--${template.status}`] ?? ""}`}>
                  {STATUS_LABELS[template.status] ?? template.status}
                </span>
                {template.parshaName ? (
                  <span className={styles.parsha}>{template.parshaName}</span>
                ) : null}
              </div>
              <h2 className={styles.cardTitle}>{template.title}</h2>
              {template.shabbatDate ? (
                <p className={styles.cardDate}>{template.shabbatDate}</p>
              ) : null}
              {template.subject ? (
                <p className={styles.cardSubject}>Subject: {template.subject}</p>
              ) : null}
              <p className={styles.cardMeta}>
                Updated {new Date(template.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
              </p>
              <div className={styles.cardActions}>
                <Link href={`/admin/templates/${template.id}/edit`} className={styles.actionLink}>
                  Edit
                </Link>
                <Link href={`/admin/templates/${template.id}/preview`} className={styles.actionLink}>
                  Preview
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
