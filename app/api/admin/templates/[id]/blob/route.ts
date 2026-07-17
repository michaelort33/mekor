import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db/client";
import { newsletterTemplates } from "@/db/schema";
import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import { sanitizeNewsletterHtml } from "@/lib/newsletter/html-sanitize";
import {
  listTemplateBlobVersions,
  seedTemplateBlobFromBodyHtml,
  writeTemplateBlobVersion,
} from "@/lib/newsletter/template-blob";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const writeSchema = z.object({
  html: z.string().min(1),
  label: z.string().trim().max(120).optional(),
  activate: z.boolean().optional().default(true),
  promptSummary: z.string().trim().max(280).optional(),
});

function parseTemplateId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id >= 1 ? id : null;
}

export async function GET(_request: Request, context: RouteContext) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const { id: rawId } = await context.params;
  const id = parseTemplateId(rawId);
  if (!id) {
    return NextResponse.json({ error: "Invalid template id." }, { status: 400 });
  }

  const [template] = await getDb()
    .select({
      id: newsletterTemplates.id,
      bodyHtml: newsletterTemplates.bodyHtml,
      activeBlobPathname: newsletterTemplates.activeBlobPathname,
      activeBlobUrl: newsletterTemplates.activeBlobUrl,
      activeBlobVersionId: newsletterTemplates.activeBlobVersionId,
    })
    .from(newsletterTemplates)
    .where(eq(newsletterTemplates.id, id))
    .limit(1);

  if (!template) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  try {
    const seeded = await seedTemplateBlobFromBodyHtml({
      templateId: id,
      bodyHtml: template.bodyHtml,
      actorUserId: adminResult.actor.id,
    });

    const [refreshed] = await getDb()
      .select({
        activeBlobPathname: newsletterTemplates.activeBlobPathname,
        activeBlobUrl: newsletterTemplates.activeBlobUrl,
        activeBlobVersionId: newsletterTemplates.activeBlobVersionId,
      })
      .from(newsletterTemplates)
      .where(eq(newsletterTemplates.id, id))
      .limit(1);

    return NextResponse.json({
      versions: seeded.versions.length > 0 ? seeded.versions : await listTemplateBlobVersions(id),
      seeded: seeded.seeded,
      activeBlobPathname: refreshed?.activeBlobPathname ?? null,
      activeBlobUrl: refreshed?.activeBlobUrl ?? null,
      activeBlobVersionId: refreshed?.activeBlobVersionId ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Blob list failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
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

  const parsed = writeSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid request." },
      { status: 400 },
    );
  }

  try {
    const html = sanitizeNewsletterHtml(parsed.data.html);
    const written = await writeTemplateBlobVersion({
      templateId: id,
      html,
      label: parsed.data.label,
      promptSummary: parsed.data.promptSummary,
      actorUserId: actor.id,
      activate: parsed.data.activate,
    });

    await writeAdminAuditLog({
      actorUserId: actor.id,
      action: "newsletter.template.blob.write",
      targetType: "newsletter_template",
      targetId: String(id),
      payload: {
        pathname: written.pathname,
        activated: Boolean(parsed.data.activate),
        bytes: written.meta.byteLength,
      },
    });

    return NextResponse.json({
      ok: true,
      version: {
        pathname: written.pathname,
        url: written.url,
        size: written.meta.byteLength,
      },
      template: written.template,
      activeBlobPathname: written.template?.activeBlobPathname ?? null,
      activeBlobUrl: written.template?.activeBlobUrl ?? null,
      activeBlobVersionId: written.template?.activeBlobVersionId ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Blob write failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
