import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import { createNewsletterChatModel } from "@/lib/newsletter/chat-model";
import { sanitizeNewsletterHtml } from "@/lib/newsletter/html-sanitize";

const requestSchema = z.object({
  mode: z.enum(["generate", "update"]).default("generate"),
  prompt: z.string().trim().min(8).max(4000),
  title: z.string().trim().max(255).default(""),
  subject: z.string().trim().max(255).default(""),
  parshaName: z.string().trim().max(120).default(""),
  shabbatDate: z.string().trim().max(120).default(""),
  hebrewDate: z.string().trim().max(120).default(""),
  candleLighting: z.string().trim().max(60).default(""),
  bodyHtml: z.string().trim().max(120_000).default(""),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .max(10)
    .default([]),
  templateId: z.number().int().min(1).optional(),
});

const aiResultSchema = z.object({
  title: z.string().trim().min(2).max(255),
  subject: z.string().trim().min(2).max(255),
  parshaName: z.string().trim().max(120),
  shabbatDate: z.string().trim().max(120),
  hebrewDate: z.string().trim().max(120),
  candleLighting: z.string().trim().max(60),
  bodyHtml: z.string().trim().min(20),
  summary: z.string().trim().max(280),
});

function buildUserPrompt(input: z.infer<typeof requestSchema>) {
  const conversation = input.history.length
    ? input.history.map((message) => `${message.role}: ${message.content}`).join("\n")
    : "(none yet)";
  const context = [
    `Mode: ${input.mode}`,
    `Requested change: ${input.prompt}`,
    `Conversation so far:\n${conversation}`,
    `Current title: ${input.title || "(empty)"}`,
    `Current subject: ${input.subject || "(empty)"}`,
    `Current parsha name: ${input.parshaName || "(empty)"}`,
    `Current shabbat date: ${input.shabbatDate || "(empty)"}`,
    `Current hebrew date: ${input.hebrewDate || "(empty)"}`,
    `Current candle lighting: ${input.candleLighting || "(empty)"}`,
    `Current HTML:\n${input.bodyHtml || "(empty)"}`,
  ].join("\n");
  return `${context}\n\nReturn JSON only.`;
}

export async function POST(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;
  const actor = adminResult.actor;

  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const model = createNewsletterChatModel();
    const modelLabel =
      process.env.NEWSLETTER_CHAT_MODEL?.trim() ||
      process.env.OPENAI_EMAIL_TEMPLATE_MODEL?.trim() ||
      "openai/gpt-4.1-mini";

    const { object } = await generateObject({
      model,
<<<<<<< HEAD
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an expert synagogue email designer working in a multi-turn editing conversation. Output strict JSON with keys: title,subject,parshaName,shabbatDate,hebrewDate,candleLighting,bodyHtml,summary. bodyHtml must be complete email-safe HTML using inline styles and no scripts. In generate mode, create the newsletter from scratch. In update mode, preserve the current HTML and metadata unless the request asks to change them; make the smallest targeted edit that satisfies the request. For weekly Shabbat emails, keep content lean (this week's schedule, sponsors, fresh announcements) and link evergreen items to https://www.mekorhabracha.org/mekor-bulletin-board instead of repeating long standing blurbs. The summary should briefly tell the admin what changed.",
        },
        {
          role: "user",
          content: buildUserPrompt(parsed.data),
        },
      ],
=======
      schema: aiResultSchema,
      system:
        "You are an expert synagogue email designer working in a multi-turn editing conversation. Output values for title, subject, parshaName, shabbatDate, hebrewDate, candleLighting, bodyHtml, and summary. bodyHtml must be complete email-safe HTML using inline styles and no scripts. In generate mode, create the newsletter from scratch. In update mode, preserve the current HTML and metadata unless the request asks to change them; make the smallest targeted edit that satisfies the request. For weekly Shabbat emails, keep content lean (this week's schedule, sponsors, fresh announcements) and link evergreen items to https://www.mekorhabracha.org/mekor-bulletin-board instead of repeating long standing blurbs. The summary should briefly tell the admin what changed.",
      prompt: buildUserPrompt(parsed.data),
>>>>>>> cbf5a6a (Fix newsletter AI Unauthorized and use AI Gateway)
      temperature: 0.4,
    });

    await writeAdminAuditLog({
      actorUserId: actor.id,
      action: "newsletter.template.ai_generated",
      targetType: "newsletter_template",
      targetId: String(parsed.data.templateId ?? 0),
      payload: {
        mode: parsed.data.mode,
        prompt: parsed.data.prompt,
        model: modelLabel,
        summary: object.summary,
      },
    });

    return NextResponse.json({
      template: {
        ...object,
        bodyHtml: sanitizeNewsletterHtml(object.bodyHtml),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate template";
    if (/AI Gateway|OPENAI_API_KEY|Newsletter chat needs/i.test(message)) {
      return NextResponse.json(
        { error: "AI is not configured for newsletter generation on this environment." },
        { status: 500 },
      );
    }
    if (/401|unauthorized|incorrect api key|invalid.*key/i.test(message)) {
      return NextResponse.json(
        { error: "AI provider rejected the request. Check AI Gateway / OpenAI credentials." },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "Unable to generate template" }, { status: 500 });
  }
}
