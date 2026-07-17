import { tool } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db/client";
import { newsletterTemplates } from "@/db/schema";
import { writeAdminAuditLog } from "@/lib/admin/actor";
import {
  assertSafeNewsletterHtml,
  sanitizeNewsletterHtml,
} from "@/lib/newsletter/html-sanitize";
import { validateNewsletterHtmlInSandbox } from "@/lib/newsletter/sandbox-validate";
import {
  activateTemplateBlobVersion,
  isTemplateVersionPath,
  listTemplateBlobVersions,
  readTemplateBlobHtml,
  writeTemplateBlobVersion,
} from "@/lib/newsletter/template-blob";

export type NewsletterChatToolContext = {
  templateId: number;
  actorUserId: number;
};

async function loadTemplate(templateId: number) {
  const [row] = await getDb()
    .select()
    .from(newsletterTemplates)
    .where(eq(newsletterTemplates.id, templateId))
    .limit(1);
  if (!row) {
    throw new Error("Template not found");
  }
  return row;
}

export function createNewsletterChatTools(ctx: NewsletterChatToolContext) {
  return {
    getTemplateHtml: tool({
      description: "Read the current newsletter template HTML and key metadata from the database.",
      inputSchema: z.object({}),
      execute: async () => {
        const template = await loadTemplate(ctx.templateId);
        return {
          templateId: template.id,
          title: template.title,
          subject: template.subject,
          parshaName: template.parshaName,
          shabbatDate: template.shabbatDate,
          hebrewDate: template.hebrewDate,
          candleLighting: template.candleLighting,
          previewText: template.previewText,
          status: template.status,
          activeBlobPathname: template.activeBlobPathname,
          bodyHtml: template.bodyHtml,
          bodyHtmlLength: template.bodyHtml.length,
        };
      },
    }),

    setTemplateHtml: tool({
      description:
        "Replace the newsletter HTML. Writes a private Blob version and activates it into body_html for send.",
      inputSchema: z.object({
        html: z.string().min(1).describe("Complete email-safe HTML"),
        label: z.string().trim().max(80).optional().describe("Short version label"),
        summary: z.string().trim().max(280).optional().describe("What changed"),
      }),
      execute: async ({ html, label, summary }) => {
        const sanitized = assertSafeNewsletterHtml(html);
        const written = await writeTemplateBlobVersion({
          templateId: ctx.templateId,
          html: sanitized,
          label: label || "ai-set",
          promptSummary: summary,
          actorUserId: ctx.actorUserId,
          activate: true,
        });

        await writeAdminAuditLog({
          actorUserId: ctx.actorUserId,
          action: "newsletter.template.blob.write",
          targetType: "newsletter_template",
          targetId: String(ctx.templateId),
          payload: {
            source: "chat.setTemplateHtml",
            pathname: written.pathname,
            bytes: written.meta.byteLength,
            summary: summary ?? null,
          },
        });

        return {
          ok: true,
          pathname: written.pathname,
          bodyHtmlLength: sanitized.length,
          title: written.template?.title,
          subject: written.template?.subject,
        };
      },
    }),

    patchTemplateHtml: tool({
      description:
        "Apply an allowlisted find/replace patch to the current HTML, then save and activate a Blob version.",
      inputSchema: z.object({
        find: z.string().min(1).max(20_000),
        replace: z.string().max(20_000),
        label: z.string().trim().max(80).optional(),
        summary: z.string().trim().max(280).optional(),
      }),
      execute: async ({ find, replace, label, summary }) => {
        const template = await loadTemplate(ctx.templateId);
        if (!template.bodyHtml.includes(find)) {
          return {
            ok: false,
            error: "Find string was not present in the current HTML.",
            bodyHtmlLength: template.bodyHtml.length,
          };
        }

        const nextHtml = assertSafeNewsletterHtml(template.bodyHtml.split(find).join(replace));
        const written = await writeTemplateBlobVersion({
          templateId: ctx.templateId,
          html: nextHtml,
          label: label || "ai-patch",
          promptSummary: summary,
          actorUserId: ctx.actorUserId,
          activate: true,
        });

        await writeAdminAuditLog({
          actorUserId: ctx.actorUserId,
          action: "newsletter.template.blob.write",
          targetType: "newsletter_template",
          targetId: String(ctx.templateId),
          payload: {
            source: "chat.patchTemplateHtml",
            pathname: written.pathname,
            bytes: written.meta.byteLength,
            summary: summary ?? null,
          },
        });

        return {
          ok: true,
          pathname: written.pathname,
          bodyHtmlLength: nextHtml.length,
          replacements: template.bodyHtml.split(find).length - 1,
        };
      },
    }),

    updateTemplateMetadata: tool({
      description: "Update newsletter metadata fields (title, subject, dates, etc.) without changing HTML.",
      inputSchema: z.object({
        title: z.string().trim().min(2).max(255).optional(),
        subject: z.string().trim().max(255).optional(),
        parshaName: z.string().trim().max(120).optional(),
        shabbatDate: z.string().trim().max(120).optional(),
        hebrewDate: z.string().trim().max(120).optional(),
        candleLighting: z.string().trim().max(60).optional(),
        previewText: z.string().trim().max(500).optional(),
        status: z.enum(["draft", "ready", "sent", "archived"]).optional(),
      }),
      execute: async (input) => {
        const updates: Partial<typeof newsletterTemplates.$inferInsert> = {
          updatedAt: new Date(),
        };
        if (input.title !== undefined) updates.title = input.title;
        if (input.subject !== undefined) updates.subject = input.subject;
        if (input.parshaName !== undefined) updates.parshaName = input.parshaName;
        if (input.shabbatDate !== undefined) updates.shabbatDate = input.shabbatDate;
        if (input.hebrewDate !== undefined) updates.hebrewDate = input.hebrewDate;
        if (input.candleLighting !== undefined) updates.candleLighting = input.candleLighting;
        if (input.previewText !== undefined) updates.previewText = input.previewText;
        if (input.status !== undefined) updates.status = input.status;

        const [row] = await getDb()
          .update(newsletterTemplates)
          .set(updates)
          .where(eq(newsletterTemplates.id, ctx.templateId))
          .returning({
            id: newsletterTemplates.id,
            title: newsletterTemplates.title,
            subject: newsletterTemplates.subject,
            parshaName: newsletterTemplates.parshaName,
            shabbatDate: newsletterTemplates.shabbatDate,
            hebrewDate: newsletterTemplates.hebrewDate,
            candleLighting: newsletterTemplates.candleLighting,
            previewText: newsletterTemplates.previewText,
            status: newsletterTemplates.status,
          });

        if (!row) throw new Error("Template not found");

        await writeAdminAuditLog({
          actorUserId: ctx.actorUserId,
          action: "newsletter.template.updated",
          targetType: "newsletter_template",
          targetId: String(ctx.templateId),
          payload: { source: "chat.updateTemplateMetadata", fields: Object.keys(input) },
        });

        return { ok: true, template: row };
      },
    }),

    listBlobVersions: tool({
      description: "List private Blob HTML versions for this template.",
      inputSchema: z.object({}),
      execute: async () => {
        const versions = await listTemplateBlobVersions(ctx.templateId);
        const template = await loadTemplate(ctx.templateId);
        return {
          activeBlobPathname: template.activeBlobPathname,
          versions: versions.map((version) => ({
            pathname: version.pathname,
            size: version.size,
            uploadedAt: version.uploadedAt,
          })),
        };
      },
    }),

    readBlobVersion: tool({
      description: "Read HTML for a specific Blob version pathname belonging to this template.",
      inputSchema: z.object({
        pathname: z.string().trim().min(1),
      }),
      execute: async ({ pathname }) => {
        if (!isTemplateVersionPath(ctx.templateId, pathname)) {
          throw new Error("Invalid template version pathname");
        }
        const html = sanitizeNewsletterHtml(await readTemplateBlobHtml(pathname));
        return { pathname, html, bodyHtmlLength: html.length };
      },
    }),

    writeBlobVersion: tool({
      description: "Write a Blob HTML version. Set activate=true to sync into body_html for sending.",
      inputSchema: z.object({
        html: z.string().min(1),
        label: z.string().trim().max(80).optional(),
        activate: z.boolean().optional().default(false),
        summary: z.string().trim().max(280).optional(),
      }),
      execute: async ({ html, label, activate, summary }) => {
        const sanitized = assertSafeNewsletterHtml(html);
        const written = await writeTemplateBlobVersion({
          templateId: ctx.templateId,
          html: sanitized,
          label: label || "ai-write",
          promptSummary: summary,
          actorUserId: ctx.actorUserId,
          activate: Boolean(activate),
        });

        await writeAdminAuditLog({
          actorUserId: ctx.actorUserId,
          action: "newsletter.template.blob.write",
          targetType: "newsletter_template",
          targetId: String(ctx.templateId),
          payload: {
            source: "chat.writeBlobVersion",
            pathname: written.pathname,
            activated: Boolean(activate),
            bytes: written.meta.byteLength,
          },
        });

        return {
          ok: true,
          pathname: written.pathname,
          activated: Boolean(activate),
          bodyHtmlLength: sanitized.length,
        };
      },
    }),

    activateBlobVersion: tool({
      description: "Activate a Blob version into the sendable body_html snapshot.",
      inputSchema: z.object({
        pathname: z.string().trim().min(1),
      }),
      execute: async ({ pathname }) => {
        const activated = await activateTemplateBlobVersion({
          templateId: ctx.templateId,
          pathname,
        });

        await writeAdminAuditLog({
          actorUserId: ctx.actorUserId,
          action: "newsletter.template.blob.activate",
          targetType: "newsletter_template",
          targetId: String(ctx.templateId),
          payload: {
            source: "chat.activateBlobVersion",
            pathname: activated.activeBlobPathname,
            versionId: activated.activeBlobVersionId,
          },
        });

        return {
          ok: true,
          pathname: activated.activeBlobPathname,
          bodyHtmlLength: activated.bodyHtml.length,
        };
      },
    }),

    validateHtml: tool({
      description:
        "Validate and sanitize newsletter HTML in Vercel Sandbox when available (local lint fallback otherwise).",
      inputSchema: z.object({
        html: z
          .string()
          .optional()
          .describe("HTML to validate. Defaults to the current template body_html."),
      }),
      execute: async ({ html }) => {
        const source = html ?? (await loadTemplate(ctx.templateId)).bodyHtml;
        return validateNewsletterHtmlInSandbox(source);
      },
    }),
  };
}
