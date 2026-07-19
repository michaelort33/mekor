import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { getDb } from "@/db/client";
import { newsletterTemplates } from "@/db/schema";
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
        title="Newsletter Studio"
        description="Split HTML editor and live preview with chat-assisted edits."
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

  return <NewsletterStudioClient template={template} />;
}
