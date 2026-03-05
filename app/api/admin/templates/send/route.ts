import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import {
  newsletterCampaignDeliveries,
  newsletterCampaigns,
  newsletterTemplates,
} from "@/db/schema";
import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import {
  loadRecipientsForGroup,
  NEWSLETTER_RECIPIENT_GROUPS,
  NEWSLETTER_RECIPIENT_GROUP_LABELS,
} from "@/lib/newsletter/recipients";
import { sendSendGridEmail } from "@/lib/notifications/sendgrid";

const payloadSchema = z.object({
  templateId: z.number().int().min(1),
  recipientGroup: z.enum(NEWSLETTER_RECIPIENT_GROUPS),
  mode: z.enum(["preview", "send"]).default("send"),
  subjectOverride: z.string().trim().max(255).optional(),
});

function personalize(template: string, input: { displayName: string; email: string }) {
  return template
    .replaceAll("{{display_name}}", input.displayName)
    .replaceAll("{{email}}", input.email);
}

export async function POST(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;
  const actor = adminResult.actor;

  const parsed = payloadSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const [template] = await db
    .select()
    .from(newsletterTemplates)
    .where(eq(newsletterTemplates.id, parsed.data.templateId))
    .limit(1);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const recipients = await loadRecipientsForGroup(db, parsed.data.recipientGroup);
  if (recipients.length === 0) {
    return NextResponse.json({ error: "No recipients in selected group" }, { status: 400 });
  }

  const subject = parsed.data.subjectOverride?.trim() || template.subject || template.title;
  if (!subject) {
    return NextResponse.json({ error: "Template subject is required" }, { status: 400 });
  }

  if (parsed.data.mode === "preview") {
    return NextResponse.json({
      mode: "preview",
      recipientGroup: parsed.data.recipientGroup,
      recipientGroupLabel: NEWSLETTER_RECIPIENT_GROUP_LABELS[parsed.data.recipientGroup],
      count: recipients.length,
      sample: recipients.slice(0, 12),
      subject,
    });
  }

  const [campaign] = await db
    .insert(newsletterCampaigns)
    .values({
      templateId: template.id,
      sentByUserId: actor.id,
      recipientGroup: parsed.data.recipientGroup,
      subject,
      senderEmail: process.env.SENDGRID_FROM_EMAIL || actor.email,
      recipientCount: recipients.length,
      status: "sending",
      startedAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  let successCount = 0;
  let failedCount = 0;

  for (const recipient of recipients) {
    try {
      const html = personalize(template.bodyHtml, {
        displayName: recipient.displayName,
        email: recipient.email,
      });
      const personalizedSubject = personalize(subject, {
        displayName: recipient.displayName,
        email: recipient.email,
      });
      const sent = await sendSendGridEmail({
        to: recipient.email,
        subject: personalizedSubject,
        html,
      });

      await db.insert(newsletterCampaignDeliveries).values({
        campaignId: campaign.id,
        templateId: template.id,
        recipientUserId: recipient.userId,
        recipientEmail: recipient.email,
        recipientName: recipient.displayName,
        status: "sent",
        provider: "sendgrid",
        providerMessageId: sent.providerMessageId,
        errorMessage: "",
        sentAt: new Date(),
        updatedAt: new Date(),
      });
      successCount += 1;
    } catch (error) {
      await db.insert(newsletterCampaignDeliveries).values({
        campaignId: campaign.id,
        templateId: template.id,
        recipientUserId: recipient.userId,
        recipientEmail: recipient.email,
        recipientName: recipient.displayName,
        status: "failed",
        provider: "sendgrid",
        providerMessageId: "",
        errorMessage: error instanceof Error ? error.message : "Unknown send error",
        sentAt: null,
        updatedAt: new Date(),
      });
      failedCount += 1;
    }
  }

  const status =
    failedCount === 0 ? "completed" : successCount === 0 ? "failed" : "partial";

  await db
    .update(newsletterCampaigns)
    .set({
      successCount,
      failedCount,
      status,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(newsletterCampaigns.id, campaign.id));

  await db
    .update(newsletterTemplates)
    .set({
      status: successCount > 0 ? "sent" : template.status,
      sentAt: successCount > 0 ? new Date() : template.sentAt,
      updatedAt: new Date(),
    })
    .where(eq(newsletterTemplates.id, template.id));

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "newsletter.campaign.sent",
    targetType: "newsletter_template",
    targetId: String(template.id),
    payload: {
      campaignId: campaign.id,
      recipientGroup: parsed.data.recipientGroup,
      recipientCount: recipients.length,
      successCount,
      failedCount,
      status,
    },
  });

  return NextResponse.json({
    mode: "send",
    campaignId: campaign.id,
    recipientCount: recipients.length,
    successCount,
    failedCount,
    status,
  });
}
