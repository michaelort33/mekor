import { createHash, randomBytes } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  communicationPreferences,
  newsletterSubscriptions,
  people,
} from "@/db/schema";

export const NEWSLETTER_TOPICS = [
  "weekly",
  "announcements",
  "events",
  "kids",
  "eruv",
  "classes",
  "community",
  "members",
] as const;
export type NewsletterTopic = (typeof NEWSLETTER_TOPICS)[number];

// The primary Shabbat newsletter list (~1,900 contacts). Every subscription
// should include this list, so it is always added alongside any other topics.
export const PRIMARY_NEWSLETTER_TOPIC: NewsletterTopic = "weekly";

// Statuses we must not silently overwrite when a person is auto-subscribed: an
// explicit unsubscribe/bounce/complaint should be respected, not resurrected.
const PROTECTED_SUBSCRIPTION_STATUSES = new Set(["unsubscribed", "bounced", "complained"]);

// Protected even when the person explicitly re-opts-in: these addresses are on
// provider suppression lists, so "resubscribing" them is a deliverability trap.
const HARD_PROTECTED_SUBSCRIPTION_STATUSES = new Set(["bounced", "complained"]);

// Resolve the full set of topics for a subscription, always including the
// primary Shabbat list and de-duplicating the rest.
export function resolveSubscriptionTopics(topics?: readonly NewsletterTopic[]): NewsletterTopic[] {
  return Array.from(new Set<NewsletterTopic>([PRIMARY_NEWSLETTER_TOPIC, ...(topics ?? [])]));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildNewsletterWelcomeEmail(unsubscribeUrl: string) {
  const safeUnsubscribeUrl = escapeHtml(unsubscribeUrl);

  return {
    subject: "Welcome to Mekor Habracha — you're on the list",
    text: [
      "Shalom,",
      "",
      "Thank you for signing up for the Mekor Habracha newsletter — you're on the list.",
      "",
      "Mekor Habracha / Center City Synagogue is a vibrant, inclusive Modern Orthodox community located in the heart of Center City, Philadelphia. Our newsletter will keep you connected to religious, educational, and social opportunities, along with community news and upcoming events.",
      "",
      "Whether you are joining us from across the street or across the world, you are always warmly welcome.",
      "",
      `If you did not request this subscription, you can unsubscribe here: ${unsubscribeUrl}`,
      "",
      "Mekor Habracha · Center City Synagogue",
      "1500 Walnut St, Suite 206, Philadelphia, PA 19102",
      "admin@mekorhabracha.org · (215) 525-4246",
    ].join("\n"),
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Welcome to the Mekor Habracha newsletter</title>
  </head>
  <body style="margin:0;padding:0;background:#f3eee3;color:#24374a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Welcome to our vibrant, inclusive community in the heart of Center City.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f3eee3;">
      <tr>
        <td align="center" style="padding:36px 16px;">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;">
            <tr>
              <td align="center" style="padding:0 16px 14px;font-family:Arial,Helvetica,sans-serif;color:#64778a;font-size:12px;line-height:1.5;letter-spacing:0.2em;text-transform:uppercase;">
                Mekor Habracha &nbsp;·&nbsp; Center City Synagogue
              </td>
            </tr>
            <tr>
              <td style="overflow:hidden;border:1px solid #ded1bb;border-radius:28px;background:#fffdf8;box-shadow:0 20px 48px rgba(31,48,67,0.12);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding:38px 38px 34px;background:#183b5a;background-image:linear-gradient(135deg,#183b5a 0%,#315f86 66%,#b88a4d 100%);font-family:Georgia,'Times New Roman',serif;color:#fffaf0;">
                      <div style="margin:0 0 13px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;letter-spacing:0.22em;text-transform:uppercase;color:#f2dfbd;">
                        A welcoming community
                      </div>
                      <h1 style="margin:0 0 14px;font-size:38px;line-height:1.12;font-weight:normal;color:#fffaf0;">
                        Welcome to Mekor Habracha
                      </h1>
                      <p style="margin:0;max-width:510px;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:1.65;color:#f7f3ea;">
                        Stay connected to Jewish life in the heart of Center City.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:34px 38px 38px;font-family:Arial,Helvetica,sans-serif;color:#2b3e51;">
                      <p style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:1.5;color:#1d344a;">
                        Shalom,
                      </p>
                      <p style="margin:0 0 18px;font-size:16px;line-height:1.75;">
                        Thank you for signing up for the Mekor Habracha newsletter.
                      </p>
                      <p style="margin:0 0 22px;font-size:16px;line-height:1.75;">
                        Mekor Habracha / Center City Synagogue is a <strong>vibrant, inclusive Modern Orthodox community</strong> located in the heart of Center City, Philadelphia. Our newsletter will keep you connected to religious, educational, and social opportunities, along with community news and upcoming events.
                      </p>
                      <div style="margin:0 0 24px;padding:20px 22px;border-left:4px solid #c69a5b;border-radius:0 18px 18px 0;background:#f7f1e5;">
                        <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.65;color:#33475a;">
                          Whether you are joining us from across the street or across the world, you are always warmly welcome.
                        </p>
                      </div>
                      <p style="margin:0 0 26px;font-size:15px;line-height:1.7;color:#33475a;">
                        You're on the list — look for our next newsletter in your inbox.
                      </p>
                      <div style="padding-top:22px;border-top:1px solid #e7ddcf;font-size:13px;line-height:1.75;color:#697a8a;">
                        <strong style="color:#2b3e51;">Mekor Habracha · Center City Synagogue</strong><br />
                        1500 Walnut St, Suite 206, Philadelphia, PA 19102<br />
                        <a href="mailto:admin@mekorhabracha.org" style="color:#1d527c;text-decoration:underline;">admin@mekorhabracha.org</a>
                        &nbsp;·&nbsp;
                        <a href="tel:+12155254246" style="color:#1d527c;text-decoration:none;">(215) 525-4246</a><br />
                        <a href="${safeUnsubscribeUrl}" style="color:#697a8a;text-decoration:underline;">Unsubscribe</a> if you did not request this or change your mind.
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function newToken() {
  return randomBytes(32).toString("base64url");
}

export async function syncNewsletterEmailPreference(personId: number) {
  const [subscribed] = await getDb()
    .select({ id: newsletterSubscriptions.id })
    .from(newsletterSubscriptions)
    .where(and(eq(newsletterSubscriptions.personId, personId), eq(newsletterSubscriptions.status, "subscribed")))
    .limit(1);
  await getDb()
    .update(communicationPreferences)
    .set({ emailOptIn: Boolean(subscribed), updatedAt: new Date() })
    .where(eq(communicationPreferences.personId, personId));
}

export function normalizeNewsletterEmail(email: string) {
  return email.trim().toLowerCase();
}

async function ensureNewsletterPerson(input: {
  email: string;
  displayName?: string;
  source: string;
  now: Date;
}) {
  const [person] = await getDb()
    .insert(people)
    .values({
      status: "guest",
      displayName: input.displayName?.trim() || input.email,
      email: input.email,
      source: input.source,
      tags: ["newsletter"],
      createdAt: input.now,
      updatedAt: input.now,
    })
    .onConflictDoUpdate({
      target: people.email,
      set: { updatedAt: input.now },
    })
    .returning({ id: people.id, displayName: people.displayName });
  if (!person) throw new Error("Unable to create newsletter contact");
  return person;
}

/**
 * Directly subscribe a contact (single opt-in) to one or more newsletter lists,
 * always including the primary Shabbat list. Used for flows where the person is
 * explicitly opting in by providing their details (the homepage signup form,
 * becoming a member), so no double opt-in confirmation email is sent.
 *
 * Existing opt-outs are respected by default. Pass `allowResubscribe` for
 * surfaces where the person is explicitly asking to be re-added (typing their
 * email into the signup form is fresh consent); even then, hard-bounced and
 * spam-complaint addresses are never resurrected — SendGrid suppresses them
 * and mailing them again only hurts deliverability.
 */
export async function subscribeEmailToNewsletterLists(input: {
  email: string;
  displayName?: string;
  topics?: readonly NewsletterTopic[];
  source: string;
  allowResubscribe?: boolean;
}) {
  const email = normalizeNewsletterEmail(input.email);
  const db = getDb();
  const now = new Date();
  const topics = resolveSubscriptionTopics(input.topics);

  const person = await ensureNewsletterPerson({
    email,
    displayName: input.displayName,
    source: input.source,
    now,
  });

  await db
    .insert(communicationPreferences)
    .values({
      personId: person.id,
      emailOptIn: true,
      preferredChannel: "email",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: communicationPreferences.personId,
      set: { emailOptIn: true, updatedAt: now },
    });

  const subscribedTopics: NewsletterTopic[] = [];
  const newlySubscribedTopics: NewsletterTopic[] = [];
  const protectedStatuses = input.allowResubscribe
    ? HARD_PROTECTED_SUBSCRIPTION_STATUSES
    : PROTECTED_SUBSCRIPTION_STATUSES;

  for (const topic of topics) {
    const [existing] = await db
      .select({ id: newsletterSubscriptions.id, status: newsletterSubscriptions.status })
      .from(newsletterSubscriptions)
      .where(and(eq(newsletterSubscriptions.personId, person.id), eq(newsletterSubscriptions.topic, topic)))
      .limit(1);

    if (existing && protectedStatuses.has(existing.status)) {
      // Respect the opt-out; do not re-subscribe.
      continue;
    }

    if (existing?.status === "subscribed") {
      subscribedTopics.push(topic);
      continue;
    }

    await db
      .insert(newsletterSubscriptions)
      .values({
        personId: person.id,
        topic,
        status: "subscribed",
        source: input.source,
        unsubscribeToken: newToken(),
        confirmedAt: now,
        unsubscribedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [newsletterSubscriptions.personId, newsletterSubscriptions.topic],
        set: {
          status: "subscribed",
          source: input.source,
          confirmationTokenHash: null,
          confirmationExpiresAt: null,
          confirmedAt: now,
          unsubscribedAt: null,
          updatedAt: now,
        },
      });
    subscribedTopics.push(topic);
    newlySubscribedTopics.push(topic);
  }

  await syncNewsletterEmailPreference(person.id);

  const [weeklyRow] = await db
    .select({ status: newsletterSubscriptions.status, unsubscribeToken: newsletterSubscriptions.unsubscribeToken })
    .from(newsletterSubscriptions)
    .where(and(eq(newsletterSubscriptions.personId, person.id), eq(newsletterSubscriptions.topic, PRIMARY_NEWSLETTER_TOPIC)))
    .limit(1);

  return {
    personId: person.id,
    topics,
    subscribedTopics,
    newlySubscribedTopics,
    weeklyUnsubscribeToken: weeklyRow?.status === "subscribed" ? weeklyRow.unsubscribeToken : null,
  };
}

export async function confirmNewsletterSubscription(token: string) {
  const hash = tokenHash(token);
  const now = new Date();
  const [subscription] = await getDb()
    .select()
    .from(newsletterSubscriptions)
    .where(eq(newsletterSubscriptions.confirmationTokenHash, hash))
    .limit(1);

  if (!subscription || subscription.status !== "pending") return { ok: false, reason: "invalid" as const };
  if (!subscription.confirmationExpiresAt || subscription.confirmationExpiresAt < now) {
    return { ok: false, reason: "expired" as const };
  }

  await getDb()
    .update(newsletterSubscriptions)
    .set({
      status: "subscribed",
      confirmedAt: now,
      confirmationTokenHash: null,
      confirmationExpiresAt: null,
      unsubscribedAt: null,
      updatedAt: now,
    })
    .where(eq(newsletterSubscriptions.id, subscription.id));
  await syncNewsletterEmailPreference(subscription.personId);

  return { ok: true as const, subscriptionId: subscription.id };
}

export async function unsubscribeNewsletter(token: string) {
  const now = new Date();
  const [subscription] = await getDb()
    .select()
    .from(newsletterSubscriptions)
    .where(eq(newsletterSubscriptions.unsubscribeToken, token))
    .limit(1);

  if (!subscription) return { ok: false };

  await getDb()
    .update(newsletterSubscriptions)
    .set({ status: "unsubscribed", unsubscribedAt: now, updatedAt: now })
    .where(eq(newsletterSubscriptions.id, subscription.id));
  await syncNewsletterEmailPreference(subscription.personId);

  return { ok: true, subscriptionId: subscription.id };
}

export async function getNewsletterUnsubscribeToken(personId: number, topic = "weekly") {
  const [subscription] = await getDb()
    .select({ token: newsletterSubscriptions.unsubscribeToken })
    .from(newsletterSubscriptions)
    .where(and(eq(newsletterSubscriptions.personId, personId), eq(newsletterSubscriptions.topic, topic)))
    .limit(1);
  return subscription?.token ?? "";
}

export async function syncNewsletterSubscriptionEvent(input: {
  email: string;
  displayName?: string;
  topic?: NewsletterTopic;
  source: string;
  status: "subscribed" | "unsubscribed" | "bounced" | "complained";
  occurredAt?: Date;
}) {
  const db = getDb();
  const now = input.occurredAt ?? new Date();
  const email = normalizeNewsletterEmail(input.email);
  const topic = input.topic ?? "weekly";
  const person = await ensureNewsletterPerson({
    email,
    displayName: input.displayName,
    source: input.source,
    now,
  });

  await db
    .insert(communicationPreferences)
    .values({
      personId: person.id,
      emailOptIn: input.status === "subscribed",
      preferredChannel: "email",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: communicationPreferences.personId,
      set: { emailOptIn: input.status === "subscribed", updatedAt: now },
    });

  const [subscription] = await db
    .insert(newsletterSubscriptions)
    .values({
      personId: person.id,
      topic,
      status: input.status,
      source: input.source,
      unsubscribeToken: newToken(),
      confirmedAt: input.status === "subscribed" ? now : null,
      unsubscribedAt: input.status === "unsubscribed" ? now : null,
      lastProviderEventAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [newsletterSubscriptions.personId, newsletterSubscriptions.topic],
      set: {
        status: input.status,
        source: input.source,
        confirmedAt: input.status === "subscribed" ? now : null,
        unsubscribedAt: input.status === "unsubscribed" ? now : null,
        lastProviderEventAt: now,
        updatedAt: now,
      },
    })
    .returning();

  return { person, subscription };
}

export function buildUnsubscribeUrl(siteOrigin: string, rawToken: string) {
  return `${siteOrigin}/api/newsletter/unsubscribe?token=${encodeURIComponent(rawToken)}`;
}
