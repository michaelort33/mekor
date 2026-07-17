import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { getDb } from "@/db/client";
import { newsletterTemplates } from "@/db/schema";
import { seedTemplateBlobFromBodyHtml } from "@/lib/newsletter/template-blob";
import { NewsletterStudioClient } from "./studio-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function NewsletterStudioPage({ params }: PageProps) {
  const { id } = await params;
  const templateId = Number(id);

  if (!Number.isInteger(templateId) || templateId < 1) {
    notFound();
  }

  if (!process.env.DATABASE_URL) {
    return (
      <AdminShell
        currentPath="/admin/templates"
        title="Newsletter Chat Studio"
        description="Chat-driven newsletter editing with Blob versions."
        breadcrumbs={[
          { href: "/admin", label: "Dashboard" },
          { href: "/admin/templates", label: "Templates" },
          { label: "Studio" },
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

  let seedNotice: string | null = null;
  if (process.env.BLOB_READ_WRITE_TOKEN && template.bodyHtml.trim()) {
    try {
      const seeded = await seedTemplateBlobFromBodyHtml({
        templateId: template.id,
        bodyHtml: template.bodyHtml,
      });
      if (seeded.seeded) {
        seedNotice = "Seeded the first private Blob version from the current database HTML.";
      }
    } catch {
      seedNotice = "Blob seeding skipped (Blob may be unavailable). Studio can still edit database HTML once Blob is configured.";
    }
  }

  const [fresh] = await getDb()
    .select()
    .from(newsletterTemplates)
    .where(eq(newsletterTemplates.id, templateId))
    .limit(1);

  return <NewsletterStudioClient template={fresh ?? template} seedNotice={seedNotice} />;
}
