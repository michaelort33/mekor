import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { getDb } from "@/db/client";
import { newsletterTemplates } from "@/db/schema";
import { EditTemplateForm } from "./template-form";
import styles from "../../new/page.module.css";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function EditTemplatePage({ params }: PageProps) {
  const { id } = await params;
  const templateId = Number(id);

  if (!Number.isInteger(templateId) || templateId < 1) {
    notFound();
  }

  if (!process.env.DATABASE_URL) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1>Edit Newsletter Template</h1>
          <Link href="/admin/templates" className={styles.backLink}>
            ← Back to templates
          </Link>
        </header>
        <p>DATABASE_URL is not configured.</p>
      </div>
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

  return <EditTemplateForm template={template} />;
}
