import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";

import { AdminShell } from "@/components/admin/admin-shell";
import adminStyles from "@/components/admin/admin-shell.module.css";
import { getDb } from "@/db/client";
import { messageCampaigns, newsletterIssues, newsletterSubscriptions, newsletterTemplates } from "@/db/schema";
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
  let subscriberCount = 0;
  let scheduledCount = 0;
  let issueCount = 0;
  let recentCampaigns: Array<{ id: number; templateId: number | null; templateTitle: string | null; subject: string; status: string; scheduledAt: Date | null; createdAt: Date }> = [];
  let recentIssues: Array<{ id: number; slug: string; title: string; publishedAt: Date }> = [];

  if (process.env.DATABASE_URL) {
    templates = await getDb()
      .select()
      .from(newsletterTemplates)
      .orderBy(desc(newsletterTemplates.updatedAt));
    const [[subscribers], [scheduled], [issues]] = await Promise.all([
      getDb().select({ count: sql<number>`count(*)::int` }).from(newsletterSubscriptions).where(eq(newsletterSubscriptions.status, "subscribed")),
      getDb().select({ count: sql<number>`count(*)::int` }).from(messageCampaigns).where(eq(messageCampaigns.status, "scheduled")),
      getDb().select({ count: sql<number>`count(*)::int` }).from(newsletterIssues),
    ]);
    subscriberCount = subscribers?.count ?? 0;
    scheduledCount = scheduled?.count ?? 0;
    issueCount = issues?.count ?? 0;
    [recentCampaigns, recentIssues] = await Promise.all([
      getDb()
        .select({
          id: messageCampaigns.id,
          templateId: messageCampaigns.templateId,
          templateTitle: newsletterTemplates.title,
          subject: messageCampaigns.subject,
          status: messageCampaigns.status,
          scheduledAt: messageCampaigns.scheduledAt,
          createdAt: messageCampaigns.createdAt,
        })
        .from(messageCampaigns)
        .leftJoin(newsletterTemplates, eq(newsletterTemplates.id, messageCampaigns.templateId))
        .where(eq(messageCampaigns.source, "newsletter"))
        .orderBy(desc(messageCampaigns.createdAt))
        .limit(12),
      getDb()
        .select({ id: newsletterIssues.id, slug: newsletterIssues.slug, title: newsletterIssues.title, publishedAt: newsletterIssues.publishedAt })
        .from(newsletterIssues)
        .orderBy(desc(newsletterIssues.publishedAt))
        .limit(8),
    ]);
  }

  const filteredTemplates = templates.filter((template) => {
    if (statusFilter && template.status !== statusFilter) return false;
    if (!q) return true;
    return [template.title, template.subject, template.parshaName ?? ""]
      .some((value) => value.toLowerCase().includes(q));
  });

  const stats = [
    { label: "Subscribers", value: String(subscriberCount), hint: "Confirmed weekly recipients" },
    { label: "Drafts", value: String(templates.filter((template) => template.status === "draft" || template.status === "ready").length), hint: "Draft or ready to send" },
    { label: "Scheduled", value: String(scheduledCount), hint: "Queued for a future send" },
    { label: "Published", value: String(issueCount), hint: "Issues in the public archive" },
  ];

  return (
    <AdminShell
      currentPath="/admin/templates"
      title="Newsletters"
      description="Create, schedule, send, publish, and monitor newsletters from one workspace."
      stats={stats}
      actions={<><Link href="/admin/newsletters/subscribers" className={adminStyles.actionPill}>Manage subscribers</Link><Link href="/admin/templates/new" className={adminStyles.actionPill}>New newsletter</Link></>}
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

      <section>
        <h2>Recent and scheduled campaigns</h2>
        {recentCampaigns.length === 0 ? <p>No newsletter campaigns have been created yet.</p> : (
          <div className={styles.grid}>
            {recentCampaigns.map((campaign) => (
              <article key={campaign.id} className={styles.card}>
                <div className={styles.cardHeader}><span className={styles.badge}>{campaign.status}</span></div>
                <h3 className={styles.cardTitle}>{campaign.templateTitle || campaign.subject}</h3>
                <p className={styles.cardSubject}>{campaign.subject}</p>
                <p className={styles.cardMeta}>{campaign.scheduledAt ? `Scheduled ${campaign.scheduledAt.toLocaleString()}` : `Created ${campaign.createdAt.toLocaleString()}`}</p>
                {campaign.templateId ? <Link href={`/admin/templates/${campaign.templateId}/edit`} className={styles.actionLink}>Open campaign details</Link> : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2>Published issues</h2>
        {recentIssues.length === 0 ? <p>Published issues will appear here after the archive backfill or first native send.</p> : (
          <div className={styles.grid}>
            {recentIssues.map((issue) => (
              <article key={issue.id} className={styles.card}>
                <h3 className={styles.cardTitle}>{issue.title}</h3>
                <p className={styles.cardMeta}>Published {issue.publishedAt.toLocaleDateString()}</p>
                <Link href={`/newsletters/${issue.slug}`} className={styles.actionLink}>View public issue</Link>
              </article>
            ))}
          </div>
        )}
      </section>

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
