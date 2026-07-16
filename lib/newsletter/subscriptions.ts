import { createHash, randomBytes } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  communicationPreferences,
  newsletterSubscriptions,
  people,
} from "@/db/schema";
import { sendSendGridEmail } from "@/lib/notifications/sendgrid";

export const NEWSLETTER_TOPICS = ["weekly", "events", "eruv", "classes", "community"] as const;
export type NewsletterTopic = (typeof NEWSLETTER_TOPICS)[number];

const CONFIRMATION_TTL_MS = 48 * 60 * 60 * 1000;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function newToken() {
  return randomBytes(32).toString("base64url");
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
  await sendSendGridEmail({
    to: email,
    subject: "Confirm your Mekor Habracha newsletter subscription",
    text: `Please confirm your subscription to Mekor Habracha's newsletter:\n\n${confirmUrl}\n\nThis link expires in 48 hours.`,
    html: `<div style="max-width:600px;margin:0 auto;padding:28px;font-family:Arial,sans-serif;color:#1f3043"><h1 style="color:#1f4f78">Confirm your subscription</h1><p>Click below to receive Mekor Habracha news and community updates.</p><p><a href="${confirmUrl}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#1f4f78;color:#fff;text-decoration:none;font-weight:700">Confirm subscription</a></p><p style="color:#5b6d7e;font-size:13px">This link expires in 48 hours.</p></div>`,
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
  await getDb()
    .update(communicationPreferences)
    .set({ emailOptIn: true, updatedAt: now })
    .where(eq(communicationPreferences.personId, subscription.personId));

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
  await getDb()
    .update(communicationPreferences)
    .set({ emailOptIn: false, updatedAt: now })
    .where(eq(communicationPreferences.personId, subscription.personId));

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
