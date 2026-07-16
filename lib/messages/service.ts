import { and, asc, eq, inArray, lte, or, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  communicationPreferences,
  duesInvoices,
  messageCampaigns,
  messageDeliveries,
  messageSuppressions,
  newsletterIssues,
  newsletterSubscriptions,
  newsletterTemplates,
  people,
  users,
} from "@/db/schema";
import { MESSAGE_SEGMENTS, type MessageSegmentKey } from "@/lib/messages/segments";
import { buildUnsubscribeUrl } from "@/lib/newsletter/subscriptions";
import { sendSendGridEmail } from "@/lib/notifications/sendgrid";

type UserRole = "visitor" | "member" | "admin" | "super_admin";
type Channel = "email" | "sms" | "whatsapp";
type Source = "manual" | "newsletter" | "automated";

type ResolvedRecipient = {
  personId: number;
  userId: number | null;
  status: "lead" | "invited" | "visitor" | "guest" | "member" | "admin" | "super_admin" | "inactive";
  displayName: string;
  email: string;
  phone: string;
  emailOptIn: boolean | null;
  smsOptIn: boolean | null;
  whatsappOptIn: boolean | null;
  doNotContact: boolean | null;
  unsubscribeToken: string | null;
};

export type MessageSendInput = {
  actorUserId: number;
  actorRole: UserRole;
  channel: Channel;
  source: Source;
  name: string;
  subject: string;
  body: string;
  segmentKey?: MessageSegmentKey;
  personIds?: number[];
  previewOnly?: boolean;
  scheduledAt?: Date | null;
  templateId?: number | null;
  publishOnComplete?: boolean;
  siteOrigin?: string;
};

type DeliveryPayload = {
  subject: string;
  body: string;
  status: string;
  segmentKey: string;
};

function clean(value: string) {
  return value.trim();
}

function uniquePositiveNumbers(values: number[]) {
  return [...new Set(values.filter((value) => Number.isInteger(value) && value > 0))];
}

function ensureSegmentAllowed(segment: MessageSegmentKey | undefined) {
  if (segment && !MESSAGE_SEGMENTS.includes(segment)) throw new Error("Unsupported segment");
}

function enforceSendPermission(input: { actorRole: UserRole; segmentKey?: MessageSegmentKey }) {
  if (input.actorRole !== "admin" && input.actorRole !== "super_admin") {
    throw new Error("Only admin accounts can send campaigns");
  }
  if (input.actorRole !== "super_admin" && input.segmentKey === "all_people") {
    throw new Error("Only super admins can send to all people");
  }
}

function personalize(template: string, input: { displayName: string; email: string; unsubscribeUrl?: string }) {
  const personalized = template
    .replaceAll("{{display_name}}", input.displayName)
    .replaceAll("{{email}}", input.email);
  return input.unsubscribeUrl === undefined
    ? personalized
    : personalized.replaceAll("{{unsubscribe_url}}", input.unsubscribeUrl);
}

function recipientSelection() {
  return {
    personId: people.id,
    userId: people.userId,
    status: people.status,
    displayName: people.displayName,
    email: people.email,
    phone: people.phone,
    emailOptIn: communicationPreferences.emailOptIn,
    smsOptIn: communicationPreferences.smsOptIn,
    whatsappOptIn: communicationPreferences.whatsappOptIn,
    doNotContact: communicationPreferences.doNotContact,
    unsubscribeToken: newsletterSubscriptions.unsubscribeToken,
  };
}

async function resolveRecipientsByPersonIds(personIds: number[]) {
  if (personIds.length === 0) return [];
  return getDb()
    .select(recipientSelection())
    .from(people)
    .leftJoin(communicationPreferences, eq(communicationPreferences.personId, people.id))
    .leftJoin(
      newsletterSubscriptions,
      and(eq(newsletterSubscriptions.personId, people.id), eq(newsletterSubscriptions.topic, "weekly")),
    )
    .where(inArray(people.id, personIds))
    .orderBy(asc(people.displayName), asc(people.id));
}

async function resolveRecipientsBySegment(segment: MessageSegmentKey) {
  if (segment === "newsletter_subscribers") {
    return getDb()
      .select(recipientSelection())
      .from(newsletterSubscriptions)
      .innerJoin(people, eq(people.id, newsletterSubscriptions.personId))
      .leftJoin(communicationPreferences, eq(communicationPreferences.personId, people.id))
      .where(
        and(
          eq(newsletterSubscriptions.topic, "weekly"),
          eq(newsletterSubscriptions.status, "subscribed"),
        ),
      )
      .orderBy(asc(people.displayName), asc(people.id));
  }

  const baseWhere =
    segment === "prospects"
      ? eq(people.status, "lead")
      : segment === "invited_not_accepted"
        ? eq(people.status, "invited")
        : segment === "active_members" || segment === "members_overdue"
          ? inArray(people.status, ["member", "admin", "super_admin"])
          : undefined;

  if (segment !== "members_overdue") {
    return getDb()
      .select(recipientSelection())
      .from(people)
      .leftJoin(communicationPreferences, eq(communicationPreferences.personId, people.id))
      .leftJoin(
        newsletterSubscriptions,
        and(eq(newsletterSubscriptions.personId, people.id), eq(newsletterSubscriptions.topic, "weekly")),
      )
      .where(baseWhere)
      .orderBy(asc(people.displayName), asc(people.id));
  }

  return getDb()
    .select(recipientSelection())
    .from(people)
    .innerJoin(users, eq(users.id, people.userId))
    .innerJoin(
      duesInvoices,
      and(eq(duesInvoices.userId, users.id), inArray(duesInvoices.status, ["open", "overdue"])),
    )
    .leftJoin(communicationPreferences, eq(communicationPreferences.personId, people.id))
    .leftJoin(
      newsletterSubscriptions,
      and(eq(newsletterSubscriptions.personId, people.id), eq(newsletterSubscriptions.topic, "weekly")),
    )
    .where(baseWhere)
    .groupBy(
      people.id,
      people.userId,
      people.status,
      people.displayName,
      people.email,
      people.phone,
      communicationPreferences.emailOptIn,
      communicationPreferences.smsOptIn,
      communicationPreferences.whatsappOptIn,
      communicationPreferences.doNotContact,
      newsletterSubscriptions.unsubscribeToken,
    )
    .having(sql`COUNT(${duesInvoices.id}) > 0`)
    .orderBy(asc(people.displayName), asc(people.id));
}

async function resolveRecipients(input: { segmentKey?: MessageSegmentKey; personIds?: number[] }) {
  const ids = uniquePositiveNumbers(input.personIds ?? []);
  if (ids.length > 0) return resolveRecipientsByPersonIds(ids);
  return resolveRecipientsBySegment(input.segmentKey ?? "active_members");
}

async function isSuppressed(input: { personId: number; channel: Channel; email: string; phone: string }) {
  const [suppressed] = await getDb()
    .select({ id: messageSuppressions.id })
    .from(messageSuppressions)
    .where(
      and(
        eq(messageSuppressions.channel, input.channel),
        or(
          input.email ? eq(messageSuppressions.email, input.email) : undefined,
          input.phone ? eq(messageSuppressions.phone, input.phone) : undefined,
          eq(messageSuppressions.personId, input.personId),
        ),
      ),
    )
    .limit(1);
  return Boolean(suppressed);
}

function canContactByPreference(channel: Channel, recipient: ResolvedRecipient) {
  if (recipient.doNotContact) return false;
  if (channel === "email") return recipient.emailOptIn !== false;
  if (channel === "sms") return recipient.smsOptIn === true;
  return recipient.whatsappOptIn === true;
}

function newsletterHtml(body: string, unsubscribeUrl: string) {
  const personalized = body.replaceAll("{{unsubscribe_url}}", unsubscribeUrl);
  if (body.includes("{{unsubscribe_url}}")) return personalized;
  return `${personalized}<div style="margin:32px auto 0;padding:20px;border-top:1px solid #d7dee6;text-align:center;font:12px Arial,sans-serif;color:#607080"><p>Mekor Habracha · 1500 Walnut St., Suite 206 · Philadelphia, PA 19102</p><p><a href="${unsubscribeUrl}" style="color:#315f86">Unsubscribe from this newsletter</a></p></div>`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 220);
}

async function publishCampaignIssue(campaignId: number) {
  const [row] = await getDb()
    .select({ campaign: messageCampaigns, template: newsletterTemplates })
    .from(messageCampaigns)
    .innerJoin(newsletterTemplates, eq(newsletterTemplates.id, messageCampaigns.templateId))
    .where(eq(messageCampaigns.id, campaignId))
    .limit(1);
  if (!row || !row.campaign.publishOnComplete) return;

  const publishedAt = row.campaign.completedAt ?? new Date();
  const slug = row.template.slug || `${slugify(row.template.title || row.campaign.subject)}-${publishedAt.toISOString().slice(0, 10)}`;
  await getDb()
    .insert(newsletterIssues)
    .values({
      templateId: row.template.id,
      campaignId,
      slug,
      title: row.template.title || row.campaign.subject,
      subject: row.campaign.subject,
      category: row.template.category,
      previewText: row.template.previewText,
      searchText: `${row.template.title} ${row.campaign.subject} ${row.template.previewText}`,
      bodyHtml: row.template.bodyHtml,
      source: "native",
      publishedAt,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: newsletterIssues.slug,
      set: {
        campaignId,
        subject: row.campaign.subject,
        previewText: row.template.previewText,
        bodyHtml: row.template.bodyHtml,
        publishedAt,
        updatedAt: new Date(),
      },
    });
  await getDb()
    .update(newsletterTemplates)
    .set({ status: "sent", sentAt: publishedAt, updatedAt: new Date() })
    .where(eq(newsletterTemplates.id, row.template.id));
}

async function claimQueuedDeliveries(campaignId: number, batchSize: number) {
  return getDb().transaction(async (tx) => {
    const ids = await tx
      .select({ id: messageDeliveries.id })
      .from(messageDeliveries)
      .where(and(eq(messageDeliveries.campaignId, campaignId), eq(messageDeliveries.status, "queued")))
      .orderBy(asc(messageDeliveries.id))
      .limit(batchSize)
      .for("update", { skipLocked: true });
    if (ids.length === 0) return [];
    const claimedIds = ids.map((row) => row.id);
    const now = new Date();
    await tx
      .update(messageDeliveries)
      .set({ status: "processing", updatedAt: now })
      .where(inArray(messageDeliveries.id, claimedIds));
    return tx
      .select()
      .from(messageDeliveries)
      .where(inArray(messageDeliveries.id, claimedIds))
      .orderBy(asc(messageDeliveries.id));
  });
}

export async function reconcileMessageCampaign(campaignId: number) {
  const [campaign] = await getDb().select().from(messageCampaigns).where(eq(messageCampaigns.id, campaignId)).limit(1);
  if (!campaign) throw new Error("Campaign not found");
  const statuses = await getDb().select({ status: messageDeliveries.status }).from(messageDeliveries).where(eq(messageDeliveries.campaignId, campaignId));
  const queuedCount = statuses.filter((row) => row.status === "queued").length;
  const processingCount = statuses.filter((row) => row.status === "processing").length;
  const successCount = statuses.filter((row) => row.status === "sent").length;
  const failedCount = statuses.filter((row) => row.status === "failed").length;
  const skippedCount = statuses.filter((row) => row.status === "skipped").length;
  if (queuedCount > 0 || processingCount > 0) {
    await getDb().update(messageCampaigns).set({ status: "sending", successCount, failedCount, skippedCount, updatedAt: new Date() }).where(eq(messageCampaigns.id, campaignId));
    return { campaignId, status: "sending" as const, recipientCount: campaign.recipientCount, queuedCount, processingCount, successCount, failedCount, skippedCount };
  }

  const status = successCount === 0 && failedCount > 0
    ? "failed"
    : failedCount > 0 || skippedCount > 0
      ? "partial"
      : "completed";
  const completedAt = campaign.completedAt ?? new Date();
  await getDb().update(messageCampaigns).set({ successCount, failedCount, skippedCount, status, completedAt, updatedAt: new Date() }).where(eq(messageCampaigns.id, campaignId));
  if (campaign.source === "newsletter" && successCount > 0) await publishCampaignIssue(campaignId);
  return { campaignId, status, recipientCount: campaign.recipientCount, queuedCount: 0, processingCount: 0, successCount, failedCount, skippedCount };
}

export async function createMessageCampaign(input: MessageSendInput) {
  ensureSegmentAllowed(input.segmentKey);
  enforceSendPermission({ actorRole: input.actorRole, segmentKey: input.segmentKey });
  if (input.channel !== "email") throw new Error("Only email channel is enabled right now");

  const subject = clean(input.subject);
  const body = input.body.trim();
  if (!subject) throw new Error("Subject is required");
  if (!body) throw new Error("Message body is required");
  if (input.source === "newsletter" && input.segmentKey !== "newsletter_subscribers" && !(input.personIds?.length)) {
    throw new Error("Newsletters must target confirmed subscribers or explicit test recipients");
  }

  const recipients = await resolveRecipients({ segmentKey: input.segmentKey, personIds: input.personIds });
  if (recipients.length === 0) throw new Error("No recipients found");
  if (input.previewOnly) {
    return {
      mode: "preview" as const,
      recipientCount: recipients.length,
      sample: recipients.slice(0, 20).map(({ personId, displayName, email, status }) => ({ personId, displayName, email, status })),
    };
  }

  const now = new Date();
  const scheduled = Boolean(input.scheduledAt && input.scheduledAt > now);
  const [campaign] = await getDb()
    .insert(messageCampaigns)
    .values({
      createdByUserId: input.actorUserId,
      templateId: input.templateId ?? null,
      source: input.source,
      channel: input.channel,
      name: clean(input.name) || (input.source === "newsletter" ? "Newsletter" : "Manual outreach"),
      subject,
      body,
      segmentKey: input.segmentKey ?? "",
      senderEmail: process.env.SENDGRID_FROM_EMAIL || "",
      scheduledAt: input.scheduledAt ?? null,
      publishOnComplete: input.publishOnComplete ?? false,
      recipientCount: recipients.length,
      status: scheduled ? "scheduled" : "sending",
      startedAt: scheduled ? input.scheduledAt! : now,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: messageCampaigns.id });

  for (const recipient of recipients) {
    const targetEmail = clean(recipient.email);
    const targetPhone = clean(recipient.phone);
    const allowed = canContactByPreference(input.channel, recipient);
    const suppressed = await isSuppressed({ personId: recipient.personId, channel: input.channel, email: targetEmail, phone: targetPhone });
    const newsletterAllowed = input.source !== "newsletter" || Boolean(recipient.unsubscribeToken) || Boolean(input.personIds?.length);
    const status = !targetEmail || !allowed || suppressed || !newsletterAllowed ? "skipped" : "queued";
    const payload: DeliveryPayload = {
      subject: personalize(subject, { displayName: recipient.displayName, email: targetEmail }),
      body: personalize(body, { displayName: recipient.displayName, email: targetEmail }),
      status: recipient.status,
      segmentKey: input.segmentKey ?? "",
    };
    await getDb().insert(messageDeliveries).values({
      campaignId: campaign.id,
      personId: recipient.personId,
      userId: recipient.userId,
      recipientEmail: targetEmail,
      recipientPhone: targetPhone,
      recipientName: recipient.displayName,
      channel: input.channel,
      provider: "sendgrid",
      status,
      errorMessage: status === "queued" ? "" : !targetEmail ? "Missing email" : suppressed ? "Suppressed recipient" : !newsletterAllowed ? "Not a confirmed newsletter subscriber" : "Contact preference opt-out",
      payloadJson: payload,
      createdAt: now,
      updatedAt: now,
    });
  }

  return { mode: scheduled ? ("scheduled" as const) : ("queued" as const), campaignId: campaign.id, recipientCount: recipients.length };
}

export async function processMessageCampaign(campaignId: number, batchSize = 50, siteOrigin = "https://www.mekorhabracha.org") {
  const [campaign] = await getDb().select().from(messageCampaigns).where(eq(messageCampaigns.id, campaignId)).limit(1);
  if (!campaign) throw new Error("Campaign not found");
  if (["completed", "partial", "failed", "cancelled"].includes(campaign.status)) return { campaignId, status: campaign.status, processed: 0, recipientCount: campaign.recipientCount };
  if (campaign.scheduledAt && campaign.scheduledAt > new Date()) return { campaignId, status: "scheduled" as const, processed: 0, recipientCount: campaign.recipientCount };

  await getDb().update(messageCampaigns).set({ status: "sending", updatedAt: new Date() }).where(eq(messageCampaigns.id, campaignId));
  const queued = await claimQueuedDeliveries(campaignId, batchSize);

  for (const delivery of queued) {
    const payload = delivery.payloadJson as DeliveryPayload;
    try {
      let unsubscribeToken = "";
      if (delivery.personId) {
        const [current] = await getDb()
          .select({
            emailOptIn: communicationPreferences.emailOptIn,
            doNotContact: communicationPreferences.doNotContact,
            subscriptionStatus: newsletterSubscriptions.status,
            unsubscribeToken: newsletterSubscriptions.unsubscribeToken,
            email: people.email,
            phone: people.phone,
          })
          .from(people)
          .leftJoin(communicationPreferences, eq(communicationPreferences.personId, people.id))
          .leftJoin(
            newsletterSubscriptions,
            and(eq(newsletterSubscriptions.personId, people.id), eq(newsletterSubscriptions.topic, "weekly")),
          )
          .where(eq(people.id, delivery.personId))
          .limit(1);
        const suppressed = current
          ? await isSuppressed({ personId: delivery.personId, channel: campaign.channel, email: current.email, phone: current.phone })
          : true;
        const subscriberRequired = campaign.source === "newsletter" && campaign.segmentKey === "newsletter_subscribers";
        const allowed = Boolean(current) && current?.doNotContact !== true && current?.emailOptIn !== false && !suppressed && (!subscriberRequired || current?.subscriptionStatus === "subscribed");
        if (!allowed) {
          await getDb().update(messageDeliveries).set({ status: "skipped", errorMessage: "Recipient opted out before delivery", updatedAt: new Date() }).where(and(eq(messageDeliveries.id, delivery.id), eq(messageDeliveries.status, "processing")));
          continue;
        }
        unsubscribeToken = current?.unsubscribeToken ?? "";
      }
      const unsubscribeUrl = unsubscribeToken ? buildUnsubscribeUrl(siteOrigin, unsubscribeToken) : "";
      const body = campaign.source === "newsletter" && unsubscribeUrl ? newsletterHtml(payload.body, unsubscribeUrl) : payload.body;
      const sent = await sendSendGridEmail({
        to: delivery.recipientEmail,
        subject: payload.subject,
        text: body.includes("<") ? undefined : body,
        html: body.includes("<") ? body : undefined,
        headers: unsubscribeUrl
          ? { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
          : undefined,
        customArgs: { delivery_id: String(delivery.id), campaign_id: String(campaignId) },
        categories: campaign.source === "newsletter" ? ["newsletter"] : [campaign.source],
      });
      const sentAt = new Date();
      await getDb().update(messageDeliveries).set({ providerMessageId: sent.providerMessageId, status: "sent", sentAt, updatedAt: sentAt }).where(and(eq(messageDeliveries.id, delivery.id), eq(messageDeliveries.status, "processing")));
      if (delivery.personId) await getDb().update(people).set({ lastContactedAt: sentAt, updatedAt: sentAt }).where(eq(people.id, delivery.personId));
    } catch (error) {
      await getDb().update(messageDeliveries).set({ status: "failed", errorMessage: error instanceof Error ? error.message : "Unknown send error", updatedAt: new Date() }).where(and(eq(messageDeliveries.id, delivery.id), eq(messageDeliveries.status, "processing")));
    }
  }

  const reconciled = await reconcileMessageCampaign(campaignId);
  return { ...reconciled, processed: queued.length };
}

export async function processDueMessageCampaigns(batchSize = 50, siteOrigin = "https://www.mekorhabracha.org") {
  const due = await getDb()
    .select({ id: messageCampaigns.id })
    .from(messageCampaigns)
    .where(
      or(
        eq(messageCampaigns.status, "sending"),
        and(eq(messageCampaigns.status, "scheduled"), lte(messageCampaigns.scheduledAt, new Date())),
      ),
    )
    .orderBy(asc(messageCampaigns.scheduledAt), asc(messageCampaigns.id))
    .limit(10);
  const results = [];
  for (const campaign of due) results.push(await processMessageCampaign(campaign.id, batchSize, siteOrigin));
  return results;
}

export async function cancelMessageCampaign(campaignId: number) {
  const [campaign] = await getDb().select().from(messageCampaigns).where(eq(messageCampaigns.id, campaignId)).limit(1);
  if (!campaign || campaign.status !== "scheduled") throw new Error("Only scheduled campaigns can be cancelled");
  const now = new Date();
  await getDb().update(messageCampaigns).set({ status: "cancelled", cancelledAt: now, updatedAt: now }).where(eq(messageCampaigns.id, campaignId));
  await getDb().update(messageDeliveries).set({ status: "skipped", errorMessage: "Campaign cancelled", updatedAt: now }).where(and(eq(messageDeliveries.campaignId, campaignId), eq(messageDeliveries.status, "queued")));
  return { campaignId, status: "cancelled" as const };
}

export async function sendMessageCampaign(input: MessageSendInput) {
  const created = await createMessageCampaign(input);
  if (created.mode === "preview" || created.mode === "scheduled") return created;
  return processMessageCampaign(created.campaignId, 50, input.siteOrigin);
}
