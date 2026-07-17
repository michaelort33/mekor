import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db/client";
import { newsletterTemplates } from "@/db/schema";
import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import { activateTemplateBlobVersion } from "@/lib/newsletter/template-blob";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const activateSchema = z.object({
  pathname: z.string().trim().min(1),
});

function parseTemplateId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id >= 1 ? id : null;
}

export async function POST(request: Request, context: RouteContext) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;
  const actor = adminResult.actor;

  const { id: rawId } = await context.params;
  const id = parseTemplateId(rawId);
  if (!id) {
    return NextResponse.json({ error: "Invalid template id." }, { status: 400 });
  }

  const [template] = await getDb()
    .select({ id: newsletterTemplates.id })
    .from(newsletterTemplates)
    .where(eq(newsletterTemplates.id, id))
    .limit(1);

  if (!template) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  const parsed = activateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid request." },
      { status: 400 },
    );
  }

  try {
    const activated = await activateTemplateBlobVersion({
      templateId: id,
      pathname: parsed.data.pathname,
    });

    await writeAdminAuditLog({
      actorUserId: actor.id,
      action: "newsletter.template.blob.activate",
      targetType: "newsletter_template",
      targetId: String(id),
      payload: {
        pathname: activated.activeBlobPathname,
        versionId: activated.activeBlobVersionId,
        bytes: activated.bodyHtml.length,
      },
    });

    return NextResponse.json({
      ok: true,
      html: activated.bodyHtml,
      template: activated,
      activeBlobPathname: activated.activeBlobPathname,
      activeBlobUrl: activated.activeBlobUrl,
      activeBlobVersionId: activated.activeBlobVersionId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Activate failed.";
    const status = message.toLowerCase().includes("invalid") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
