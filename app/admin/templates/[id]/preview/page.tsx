import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { getDb } from "@/db/client";
import { newsletterTemplates } from "@/db/schema";
import styles from "./page.module.css";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function TemplatePreviewPage({ params }: PageProps) {
  const { id } = await params;
  const templateId = Number(id);

  if (!Number.isInteger(templateId) || templateId < 1) {
    notFound();
  }

  if (!process.env.DATABASE_URL) {
    return (
      <AdminShell
        currentPath="/admin/templates"
        title="Template Preview"
        description="Render the final email exactly as the recipient sees it."
        breadcrumbs={[
          { href: "/admin", label: "Dashboard" },
          { href: "/admin/templates", label: "Templates" },
          { label: "Preview" },
        ]}
      >
        <p>DATABASE_URL is not configured.</p>
      </AdminShell>
    );
  }

  const [template] = await getDb()
    .select()
    .from(newsletterTemplates)
    .where(eq(newsletterTemplates.id, templateId))
    .limit(1);

  if (!template) {
    notFound();
  }

  return (
    <AdminShell
      currentPath="/admin/templates"
      title={template.title}
      description="Final HTML preview for review before sending."
      breadcrumbs={[
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/templates", label: "Templates" },
        { label: "Preview" },
      ]}
      actions={<Link href="/admin/templates" className={styles.backLink}>Back to templates</Link>}
    >
      <section className={styles.frame}>
        <div dangerouslySetInnerHTML={{ __html: template.bodyHtml }} />
      </section>
    </AdminShell>
  );
}
