import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { getDb } from "@/db/client";
import { newsletterTemplates } from "@/db/schema";
import { AdminShell } from "@/components/admin/admin-shell";
import { EditTemplateForm } from "./template-form";

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
      <AdminShell
        currentPath="/admin/templates"
        title="Edit Newsletter Template"
        description="Update content, regenerate layout, preview recipients, and send."
        breadcrumbs={[
          { href: "/admin", label: "Dashboard" },
          { href: "/admin/templates", label: "Templates" },
          { label: "Edit template" },
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

  return <EditTemplateForm template={template} />;
}
