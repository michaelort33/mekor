import { tool } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db/client";
import { newsletterTemplates } from "@/db/schema";
import { writeAdminAuditLog } from "@/lib/admin/actor";
import {
  assertSafeNewsletterHtml,
  lintNewsletterHtml,
  sanitizeNewsletterHtml,
} from "@/lib/newsletter/html-sanitize";

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

async function saveBodyHtml(templateId: number, html: string) {
  const sanitized = assertSafeNewsletterHtml(html);
  const [row] = await getDb()
    .update(newsletterTemplates)
    .set({
      bodyHtml: sanitized,
      updatedAt: new Date(),
    })
    .where(eq(newsletterTemplates.id, templateId))
    .returning({
      id: newsletterTemplates.id,
      title: newsletterTemplates.title,
      subject: newsletterTemplates.subject,
      bodyHtml: newsletterTemplates.bodyHtml,
    });
  if (!row) throw new Error("Template not found");
  return row;
}

/**
 * DB-first newsletter chat tools.
 * Working HTML lives in `newsletter_templates.body_html` (same send snapshot).
 * Validation uses local sanitize/lint — no Sandbox or Blob version store.
 */
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
          bodyHtml: template.bodyHtml,
          bodyHtmlLength: template.bodyHtml.length,
        };
      },
    }),

    setTemplateHtml: tool({
      description: "Replace the newsletter HTML in the database (sendable body_html snapshot).",
      inputSchema: z.object({
        html: z.string().min(1).describe("Complete email-safe HTML"),
        summary: z.string().trim().max(280).optional().describe("What changed"),
      }),
      execute: async ({ html, summary }) => {
        const row = await saveBodyHtml(ctx.templateId, html);
        await writeAdminAuditLog({
          actorUserId: ctx.actorUserId,
          action: "newsletter.template.html_set",
          targetType: "newsletter_template",
          targetId: String(ctx.templateId),
          payload: {
            source: "chat.setTemplateHtml",
            bytes: row.bodyHtml.length,
            summary: summary ?? null,
          },
        });
        return {
          ok: true,
          bodyHtml: row.bodyHtml,
          bodyHtmlLength: row.bodyHtml.length,
          title: row.title,
          subject: row.subject,
        };
      },
    }),

    patchTemplateHtml: tool({
      description: "Apply an allowlisted find/replace patch to the current HTML, then save to the database.",
      inputSchema: z.object({
        find: z.string().min(1).max(20_000),
        replace: z.string().max(20_000),
        summary: z.string().trim().max(280).optional(),
      }),
      execute: async ({ find, replace, summary }) => {
        const template = await loadTemplate(ctx.templateId);
        if (!template.bodyHtml.includes(find)) {
          return {
            ok: false,
            error: "Find string was not present in the current HTML.",
            bodyHtmlLength: template.bodyHtml.length,
          };
        }

        const nextHtml = template.bodyHtml.split(find).join(replace);
        const row = await saveBodyHtml(ctx.templateId, nextHtml);
        await writeAdminAuditLog({
          actorUserId: ctx.actorUserId,
          action: "newsletter.template.html_patched",
          targetType: "newsletter_template",
          targetId: String(ctx.templateId),
          payload: {
            source: "chat.patchTemplateHtml",
            bytes: row.bodyHtml.length,
            summary: summary ?? null,
            replacements: template.bodyHtml.split(find).length - 1,
          },
        });

        return {
          ok: true,
          bodyHtml: row.bodyHtml,
          bodyHtmlLength: row.bodyHtml.length,
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

    validateHtml: tool({
      description: "Sanitize and lint newsletter HTML locally (email-safe checks; no Sandbox).",
      inputSchema: z.object({
        html: z
          .string()
          .optional()
          .describe("HTML to validate. Defaults to the current template body_html."),
      }),
      execute: async ({ html }) => {
        const source = html ?? (await loadTemplate(ctx.templateId)).bodyHtml;
        const sanitizedHtml = sanitizeNewsletterHtml(source);
        const issues = lintNewsletterHtml(sanitizedHtml);
        return {
          ok: issues.every((issue) => issue.level !== "error"),
          mode: "local" as const,
          sanitizedHtml,
          issues,
        };
      },
    }),
  };
}
