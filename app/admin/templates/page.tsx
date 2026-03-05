import Link from "next/link";
import { desc } from "drizzle-orm";

import { AdminShell } from "@/components/admin/admin-shell";
import adminStyles from "@/components/admin/admin-shell.module.css";
import { getDb } from "@/db/client";
import { newsletterTemplates } from "@/db/schema";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  ready: "Ready",
  sent: "Sent",
  archived: "Archived",
};

type TemplatesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminTemplatesPage({ searchParams }: TemplatesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const q = typeof resolvedSearchParams.q === "string" ? resolvedSearchParams.q.trim().toLowerCase() : "";
  const statusFilter = typeof resolvedSearchParams.status === "string" ? resolvedSearchParams.status.trim().toLowerCase() : "";
  let templates: (typeof newsletterTemplates.$inferSelect)[] = [];

  if (process.env.DATABASE_URL) {
    templates = await getDb()
      .select()
      .from(newsletterTemplates)
      .orderBy(desc(newsletterTemplates.updatedAt));
  }

  const filteredTemplates = templates.filter((template) => {
    if (statusFilter && template.status !== statusFilter) return false;
    if (!q) return true;
    return [template.title, template.subject, template.parshaName ?? ""]
      .some((value) => value.toLowerCase().includes(q));
  });

  const stats = [
    { label: "Templates", value: String(templates.length), hint: "Saved newsletter drafts and campaigns" },
    { label: "Ready", value: String(templates.filter((template) => template.status === "ready").length), hint: "Ready to send" },
    { label: "Visible", value: String(filteredTemplates.length), hint: q || statusFilter ? "Matches current filter" : "All templates" },
  ];

  return (
    <AdminShell
      currentPath="/admin/templates"
      title="Newsletter Templates"
      description="Create templates, generate HTML designs, target member groups, and send campaigns with SendGrid."
      stats={stats}
      actions={<Link href="/admin/templates/new" className={adminStyles.actionPill}>New template</Link>}
    >
      <form className={adminStyles.toolbar} method="GET">
        <div className={adminStyles.toolbarHeader}>
          <p className={adminStyles.toolbarTitle}>Template filters</p>
          <p className={adminStyles.toolbarMeta}>Find the right draft or sent campaign by title, subject, or status.</p>
        </div>
        <div className={adminStyles.toolbarFields}>
          <label>
            Search
            <input type="search" name="q" defaultValue={typeof resolvedSearchParams.q === "string" ? resolvedSearchParams.q : ""} placeholder="Parsha, subject, title" />
          </label>
          <label>
            Status
            <select name="status" defaultValue={typeof resolvedSearchParams.status === "string" ? resolvedSearchParams.status : ""}>
              <option value="">All</option>
              <option value="draft">draft</option>
              <option value="ready">ready</option>
              <option value="sent">sent</option>
              <option value="archived">archived</option>
            </select>
          </label>
        </div>
        <div className={adminStyles.toolbarActions}>
          <button type="submit" className={adminStyles.primaryButton}>Apply filters</button>
          <Link href="/admin/templates" className={adminStyles.secondaryButton}>Clear filters</Link>
        </div>
      </form>

      {filteredTemplates.length === 0 ? (
        <div className={styles.empty}>
          <p>{templates.length === 0 ? "No templates yet." : "No templates match the current filters."}</p>
          <Link href="/admin/templates/new" className={styles.createButton}>
            {templates.length === 0 ? "Create your first template" : "Create a new template"}
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredTemplates.map((template) => (
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
                  Edit & Send
                </Link>
                <Link href={`/admin/templates/${template.id}/preview`} className={styles.actionLink}>
                  Preview
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
