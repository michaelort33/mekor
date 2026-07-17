import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { newsletterTemplates } from "@/db/schema";
import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import { createNewsletterChatModel } from "@/lib/newsletter/chat-model";
import { createNewsletterChatTools } from "@/lib/newsletter/chat-tools";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are the Mekor Habracha newsletter studio assistant.
Help admins craft email-safe synagogue newsletters (weekly Shabbat, announcements, events).

Rules:
- Prefer tools over guessing. Call getTemplateHtml before editing.
- Use setTemplateHtml for full rewrites and patchTemplateHtml for small edits.
- Keep HTML email-safe: tables/inline styles, no scripts, no iframes, no javascript: URLs.
- After substantive HTML changes, call validateHtml.
- Use updateTemplateMetadata for title/subject/parsha/dates.
- The database body_html field is the sendable source of truth (no separate Blob version store).
- Never invent personal member data. Keep tone warm, clear, and professional.
- Summarize what you changed in plain language after tools finish.`;

function resolveTemplateId(request: Request, body: Record<string, unknown>) {
  const fromQuery = Number(new URL(request.url).searchParams.get("templateId"));
  if (Number.isInteger(fromQuery) && fromQuery >= 1) return fromQuery;

  const fromBody = Number(body.templateId);
  if (Number.isInteger(fromBody) && fromBody >= 1) return fromBody;

  return null;
}

export async function POST(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;
  const actor = adminResult.actor;

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const templateId = resolveTemplateId(request, body);
  if (!templateId) {
    return NextResponse.json({ error: "templateId is required." }, { status: 400 });
  }

  const [template] = await getDb()
    .select({ id: newsletterTemplates.id, title: newsletterTemplates.title })
    .from(newsletterTemplates)
    .where(eq(newsletterTemplates.id, templateId))
    .limit(1);

  if (!template) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  const messages = Array.isArray(body.messages) ? (body.messages as UIMessage[]) : null;
  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "messages are required." }, { status: 400 });
  }

  let model;
  try {
    model = createNewsletterChatModel();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat model is not configured.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const tools = createNewsletterChatTools({
    templateId,
    actorUserId: actor.id,
  });

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "newsletter.template.chat",
    targetType: "newsletter_template",
    targetId: String(templateId),
    payload: {
      title: template.title,
      messageCount: messages.length,
    },
  });

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages, { tools }),
    tools,
    stopWhen: stepCountIs(8),
    temperature: 0.4,
  });

  return result.toUIMessageStreamResponse();
}
