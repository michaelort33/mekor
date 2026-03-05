import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";

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

function ensureConfigured() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required");
  }
}

function buildUserPrompt(input: z.infer<typeof requestSchema>) {
  const context = [
    `Mode: ${input.mode}`,
    `Requested change: ${input.prompt}`,
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
    ensureConfigured();
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_EMAIL_TEMPLATE_MODEL || "gpt-4.1-mini";
    const completion = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an expert synagogue email designer. Output strict JSON with keys: title,subject,parshaName,shabbatDate,hebrewDate,candleLighting,bodyHtml,summary. bodyHtml must be complete email-safe HTML using inline styles and no scripts.",
        },
        {
          role: "user",
          content: buildUserPrompt(parsed.data),
        },
      ],
      temperature: 0.4,
    });

    const content = completion.choices[0]?.message?.content || "";
    const parsedJson = JSON.parse(content) as unknown;
    const result = aiResultSchema.safeParse(parsedJson);
    if (!result.success) {
      return NextResponse.json({ error: "OpenAI returned invalid template format" }, { status: 502 });
    }

    await writeAdminAuditLog({
      actorUserId: actor.id,
      action: "newsletter.template.ai_generated",
      targetType: "newsletter_template",
      targetId: String(parsed.data.templateId ?? 0),
      payload: {
        mode: parsed.data.mode,
        prompt: parsed.data.prompt,
        model,
        summary: result.data.summary,
      },
    });

    return NextResponse.json({ template: result.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate template";
    if (message.includes("OPENAI_API_KEY")) {
      return NextResponse.json({ error: "OpenAI is not configured" }, { status: 500 });
    }
    return NextResponse.json({ error: "Unable to generate template" }, { status: 500 });
  }
}
