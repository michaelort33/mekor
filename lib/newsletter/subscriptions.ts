import { createHash, randomBytes } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  communicationPreferences,
  newsletterSubscriptions,
  people,
} from "@/db/schema";
import { sendSendGridEmail } from "@/lib/notifications/sendgrid";

export const NEWSLETTER_TOPICS = ["weekly", "announcements", "events", "kids", "eruv", "classes", "community"] as const;
export type NewsletterTopic = (typeof NEWSLETTER_TOPICS)[number];

const CONFIRMATION_TTL_MS = 48 * 60 * 60 * 1000;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildNewsletterConfirmationEmail(confirmUrl: string) {
  const safeConfirmUrl = escapeHtml(confirmUrl);

  return {
    subject: "Welcome to Mekor Habracha — confirm your subscription",
    text: [
      "Shalom,",
      "",
      "Thank you for signing up for the Mekor Habracha newsletter.",
      "",
      "Mekor Habracha / Center City Synagogue is a vibrant, inclusive Modern Orthodox community located in the heart of Center City, Philadelphia. Our newsletter will keep you connected to religious, educational, and social opportunities, along with community news and upcoming events.",
      "",
      "Please confirm your subscription:",
      confirmUrl,
      "",
      "Whether you are joining us from across the street or across the world, you are always warmly welcome.",
      "",
      "This confirmation link expires in 48 hours. If you did not request this subscription, you can simply ignore this email.",
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
    <title>Confirm your Mekor Habracha newsletter subscription</title>
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
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 26px;">
                        <tr>
                          <td align="center" style="padding:8px 0;">
                            <a href="${safeConfirmUrl}" style="display:inline-block;padding:15px 25px;border-radius:999px;background:#1d527c;color:#ffffff;font-size:16px;line-height:1.2;font-weight:bold;text-decoration:none;box-shadow:0 10px 22px rgba(29,82,124,0.2);">
                              Confirm my subscription
                            </a>
                          </td>
                        </tr>
                      </table>
                      <div style="margin:0 0 24px;padding:20px 22px;border-left:4px solid #c69a5b;border-radius:0 18px 18px 0;background:#f7f1e5;">
                        <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.65;color:#33475a;">
                          Whether you are joining us from across the street or across the world, you are always warmly welcome.
                        </p>
                      </div>
                      <p style="margin:0 0 8px;font-size:13px;line-height:1.65;color:#697a8a;">
                        This confirmation link expires in 48 hours. If you did not request this subscription, you can simply ignore this email.
                      </p>
                      <p style="margin:0 0 26px;font-size:13px;line-height:1.65;word-break:break-word;color:#697a8a;">
                        If the button does not open, copy and paste this link into your browser:<br />
                        <a href="${safeConfirmUrl}" style="color:#1d527c;text-decoration:underline;">${safeConfirmUrl}</a>
                      </p>
                      <div style="padding-top:22px;border-top:1px solid #e7ddcf;font-size:13px;line-height:1.75;color:#697a8a;">
                        <strong style="color:#2b3e51;">Mekor Habracha · Center City Synagogue</strong><br />
                        1500 Walnut St, Suite 206, Philadelphia, PA 19102<br />
                        <a href="mailto:admin@mekorhabracha.org" style="color:#1d527c;text-decoration:underline;">admin@mekorhabracha.org</a>
                        &nbsp;·&nbsp;
                        <a href="tel:+12155254246" style="color:#1d527c;text-decoration:none;">(215) 525-4246</a>
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

export async function requestNewsletterSubscription(input: {
  email: string;
  topic?: NewsletterTopic;
  source: string;
  siteOrigin: string;
}) {
  const email = normalizeNewsletterEmail(input.email);
  const topic = input.topic ?? "weekly";
  const db = getDb();
  const now = new Date();

  const person = await ensureNewsletterPerson({ email, source: input.source, now });

  await db
    .insert(communicationPreferences)
    .values({
      personId: person.id,
      emailOptIn: false,
      preferredChannel: "email",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: communicationPreferences.personId,
      set: { updatedAt: now },
    });

  const [existing] = await db
    .select()
    .from(newsletterSubscriptions)
    .where(and(eq(newsletterSubscriptions.personId, person.id), eq(newsletterSubscriptions.topic, topic)))
    .limit(1);

  if (existing?.status === "subscribed") {
    await db
      .update(communicationPreferences)
      .set({ emailOptIn: true, updatedAt: now })
      .where(eq(communicationPreferences.personId, person.id));
    return { subscription: existing, alreadySubscribed: true, confirmationSent: false };
  }

  const confirmationToken = newToken();
  const unsubscribeToken = existing?.unsubscribeToken ?? newToken();
  const confirmationExpiresAt = new Date(now.getTime() + CONFIRMATION_TTL_MS);

  const [subscription] = existing
    ? await db
        .update(newsletterSubscriptions)
        .set({
          status: "pending",
          source: input.source,
          confirmationTokenHash: tokenHash(confirmationToken),
          confirmationExpiresAt,
          unsubscribeToken,
          unsubscribedAt: null,
          updatedAt: now,
        })
        .where(eq(newsletterSubscriptions.id, existing.id))
        .returning()
    : await db
        .insert(newsletterSubscriptions)
        .values({
          personId: person.id,
          topic,
          status: "pending",
          source: input.source,
          confirmationTokenHash: tokenHash(confirmationToken),
          confirmationExpiresAt,
          unsubscribeToken,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

  if (!subscription) throw new Error("Unable to create newsletter subscription");

  const confirmUrl = `${input.siteOrigin}/api/newsletter/confirm?token=${encodeURIComponent(confirmationToken)}`;
  const confirmationEmail = buildNewsletterConfirmationEmail(confirmUrl);
  await sendSendGridEmail({
    to: email,
    subject: confirmationEmail.subject,
    text: confirmationEmail.text,
    html: confirmationEmail.html,
    categories: ["newsletter-confirmation"],
  });

  return { subscription, alreadySubscribed: false, confirmationSent: true };
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
