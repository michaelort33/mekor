import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import { generateNewsletterHtml, NEWSLETTER_DESIGN_PRESETS } from "@/lib/newsletter/designs";

const designSchema = z.object({
  templateId: z.number().int().min(1).optional(),
  preset: z.enum(NEWSLETTER_DESIGN_PRESETS),
  title: z.string().trim().min(2).max(255),
  subtitle: z.string().trim().max(255).default(""),
  intro: z.string().trim().max(3000).default(""),
  primarySectionTitle: z.string().trim().min(2).max(120),
  primarySectionBody: z.string().trim().max(5000).default(""),
  secondarySectionTitle: z.string().trim().min(2).max(120),
  secondarySectionBody: z.string().trim().max(5000).default(""),
  footer: z.string().trim().max(500).default(""),
});

export async function POST(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;
  const actor = adminResult.actor;

  const parsed = designSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const bodyHtml = generateNewsletterHtml(parsed.data);

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "newsletter.template.design_generated",
    targetType: "newsletter_template",
    targetId: String(parsed.data.templateId ?? 0),
    payload: {
      preset: parsed.data.preset,
      title: parsed.data.title,
      subject: "",
    },
  });

  return NextResponse.json({ bodyHtml });
}
