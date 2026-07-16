import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { newsletterTemplates, people, users } from "@/db/schema";
import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import { sendMessageCampaign } from "@/lib/messages/service";
import { resolveSiteOriginFromRequest } from "@/lib/site-origin";

const payloadSchema = z.object({
  templateId: z.number().int().min(1),
  recipientGroup: z.enum(["newsletter_subscribers", "admins_only"]).default("newsletter_subscribers"),
  mode: z.enum(["preview", "send", "schedule"]).default("send"),
  subjectOverride: z.string().trim().max(255).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export async function POST(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;
  const actor = adminResult.actor;

  const parsed = payloadSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.mode === "schedule" && !parsed.data.scheduledAt) {
    return NextResponse.json({ error: "A future scheduled time is required" }, { status: 400 });
  }
  if (parsed.data.mode === "schedule" && new Date(parsed.data.scheduledAt!).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Scheduled time must be in the future" }, { status: 400 });
  }

  const [template] = await getDb()
    .select()
    .from(newsletterTemplates)
    .where(eq(newsletterTemplates.id, parsed.data.templateId))
    .limit(1);
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const subject = parsed.data.subjectOverride?.trim() || template.subject || template.title;
  if (!subject) return NextResponse.json({ error: "Template subject is required" }, { status: 400 });

  let personIds: number[] | undefined;
  if (parsed.data.recipientGroup === "admins_only") {
    const adminPeople = await getDb()
      .select({ personId: people.id })
      .from(people)
      .innerJoin(users, eq(users.id, people.userId))
      .where(inArray(users.role, ["admin", "super_admin"]));
    personIds = adminPeople.map((row) => row.personId);
  }

  try {
    const result = await sendMessageCampaign({
      actorUserId: actor.id,
      actorRole: actor.role,
      source: "newsletter",
      channel: "email",
      name: template.title || subject,
      subject,
      body: template.bodyHtml,
      segmentKey: parsed.data.recipientGroup === "newsletter_subscribers" ? "newsletter_subscribers" : undefined,
      personIds,
      previewOnly: parsed.data.mode === "preview",
      scheduledAt: parsed.data.mode === "schedule" ? new Date(parsed.data.scheduledAt!) : null,
      templateId: template.id,
      publishOnComplete: parsed.data.recipientGroup === "newsletter_subscribers" && template.publishOnSend,
      siteOrigin: resolveSiteOriginFromRequest(request),
    });

    await writeAdminAuditLog({
      actorUserId: actor.id,
      action: parsed.data.mode === "preview" ? "newsletter.campaign.previewed" : parsed.data.mode === "schedule" ? "newsletter.campaign.scheduled" : "newsletter.campaign.sent",
      targetType: "newsletter_template",
      targetId: String(template.id),
      payload: {
        campaignId: "campaignId" in result ? result.campaignId : null,
        recipientGroup: parsed.data.recipientGroup,
        recipientCount: result.recipientCount,
        scheduledAt: parsed.data.scheduledAt ?? null,
      },
    });

    return NextResponse.json({ ...result, recipientGroup: parsed.data.recipientGroup, subject });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to process newsletter" }, { status: 400 });
  }
}
