import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { newsletterSubscriptions, newsletterTemplates, people, users } from "@/db/schema";
import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import { sendMessageCampaign } from "@/lib/messages/service";
import { sanitizeNewsletterHtml } from "@/lib/newsletter/html-sanitize";
import {
  getNewsletterRecipientList,
  NEWSLETTER_RECIPIENT_LIST_KEYS,
} from "@/lib/newsletter/recipient-lists";
import { resolveSiteOriginFromRequest } from "@/lib/site-origin";

const payloadSchema = z.object({
  templateId: z.number().int().min(1),
  recipientGroup: z.enum(["newsletter_subscribers", "admins_only", "selected", "recipient_list"]).default("newsletter_subscribers"),
  /** Subscription topic for subscriber sends (weekly, announcements, events, kids, …). */
  topic: z.string().trim().toLowerCase().regex(/^[a-z0-9_-]{1,80}$/).optional(),
  recipientListKey: z.enum(NEWSLETTER_RECIPIENT_LIST_KEYS).optional(),
  personIds: z.array(z.number().int().min(1)).max(5000).optional(),
  mode: z.enum(["preview", "send", "schedule"]).default("send"),
  subjectOverride: z.string().trim().max(255).optional(),
  scheduledAt: z.string().datetime().optional(),
  bodyHtmlOverride: z.string().max(120_000).optional(),
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

  if (parsed.data.recipientGroup === "selected" && !(parsed.data.personIds?.length)) {
    return NextResponse.json({ error: "Select at least one recipient." }, { status: 400 });
  }
  if (parsed.data.recipientGroup === "recipient_list" && !parsed.data.recipientListKey) {
    return NextResponse.json({ error: "Select a newsletter recipient list." }, { status: 400 });
  }

  const topic = parsed.data.recipientGroup === "newsletter_subscribers" ? (parsed.data.topic ?? "weekly") : "weekly";
  if (topic !== "weekly") {
    const [topicRow] = await getDb()
      .select({ personId: newsletterSubscriptions.personId })
      .from(newsletterSubscriptions)
      .where(and(eq(newsletterSubscriptions.topic, topic), eq(newsletterSubscriptions.status, "subscribed")))
      .limit(1);
    if (!topicRow) {
      return NextResponse.json({ error: `No confirmed subscribers found for the "${topic}" list.` }, { status: 400 });
    }
  }

  let personIds: number[] | undefined;
  if (parsed.data.recipientGroup === "selected") {
    personIds = [...new Set(parsed.data.personIds ?? [])];
    const confirmedRows = await getDb()
      .select({ personId: newsletterSubscriptions.personId })
      .from(newsletterSubscriptions)
      .where(
        and(
          inArray(newsletterSubscriptions.personId, personIds),
          eq(newsletterSubscriptions.topic, "weekly"),
          eq(newsletterSubscriptions.status, "subscribed"),
        ),
      );
    const confirmedIds = new Set(confirmedRows.map((row) => row.personId));
    if (personIds.some((personId) => !confirmedIds.has(personId))) {
      return NextResponse.json(
        { error: "Every selected recipient must be a confirmed weekly subscriber." },
        { status: 400 },
      );
    }
  } else if (parsed.data.recipientGroup === "recipient_list") {
    const recipientList = getNewsletterRecipientList(parsed.data.recipientListKey!);
    const recipientRows = await getDb()
      .select({ personId: people.id, email: people.email })
      .from(people)
      .innerJoin(
        newsletterSubscriptions,
        and(
          eq(newsletterSubscriptions.personId, people.id),
          eq(newsletterSubscriptions.topic, "weekly"),
          eq(newsletterSubscriptions.status, "subscribed"),
        ),
      )
      .where(inArray(people.email, recipientList.emails));
    const personIdByEmail = new Map(recipientRows.map((row) => [row.email, row.personId]));
    const missingEmails = recipientList.emails.filter((email) => !personIdByEmail.has(email));
    if (missingEmails.length > 0) {
      return NextResponse.json(
        { error: `Test recipient is not a confirmed weekly subscriber: ${missingEmails.join(", ")}` },
        { status: 400 },
      );
    }
    personIds = recipientList.emails.map((email) => personIdByEmail.get(email)!);
  } else if (parsed.data.recipientGroup === "admins_only") {
    const adminPeople = await getDb()
      .select({ personId: people.id })
      .from(people)
      .innerJoin(users, eq(users.id, people.userId))
      .where(inArray(users.role, ["admin", "super_admin"]));
    personIds = adminPeople.map((row) => row.personId);
  }

  const body = sanitizeNewsletterHtml(parsed.data.bodyHtmlOverride?.trim() || template.bodyHtml);
  if (!body) return NextResponse.json({ error: "Newsletter HTML body is empty." }, { status: 400 });

  try {
    const result = await sendMessageCampaign({
      actorUserId: actor.id,
      actorRole: actor.role,
      source: "newsletter",
      channel: "email",
      name: template.title || subject,
      subject,
      body,
      segmentKey: parsed.data.recipientGroup === "admins_only" ? undefined : "newsletter_subscribers",
      newsletterTopic: topic,
      personIds,
      previewOnly: parsed.data.mode === "preview",
      scheduledAt: parsed.data.mode === "schedule" ? new Date(parsed.data.scheduledAt!) : null,
      templateId: template.id,
      publishOnComplete: parsed.data.recipientGroup === "newsletter_subscribers" && topic === "weekly" && template.publishOnSend,
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
        topic: parsed.data.recipientGroup === "newsletter_subscribers" ? topic : null,
        recipientListKey: parsed.data.recipientListKey ?? null,
        selectedCount: personIds?.length ?? null,
        recipientCount: result.recipientCount,
        scheduledAt: parsed.data.scheduledAt ?? null,
      },
    });

    return NextResponse.json({
      ...result,
      recipientGroup: parsed.data.recipientGroup,
      topic: parsed.data.recipientGroup === "newsletter_subscribers" ? topic : null,
      recipientListKey: parsed.data.recipientListKey ?? null,
      subject,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to process newsletter" }, { status: 400 });
  }
}
