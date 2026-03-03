import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

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
      <main className={styles.page}>
        <header className={styles.header}>
          <h1>Template Preview</h1>
          <Link href="/admin/templates" className={styles.backLink}>
            ← Back to templates
          </Link>
        </header>
        <p>DATABASE_URL is not configured.</p>
      </main>
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
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>{template.title}</h1>
        <Link href="/admin/templates" className={styles.backLink}>
          ← Back to templates
        </Link>
      </header>
      <section className={styles.frame}>
        <div dangerouslySetInnerHTML={{ __html: template.bodyHtml }} />
      </section>
    </main>
  );
}
