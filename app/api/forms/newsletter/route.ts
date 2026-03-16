import { and, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { adminInboxEvents, mailchimpSignupEvents } from "@/db/schema";
import {
  createAdminInboxEvent,
  getCategoryForMailchimpSignup,
  getCategoryLabel,
} from "@/lib/admin/inbox";
import { sendAdminInboxAlerts } from "@/lib/notifications/admin-alerts";
import { resolveSiteOriginFromRequest } from "@/lib/site-origin";

const newsletterSchema = z.object({
  email: z.string().trim().email().max(255),
  sourcePath: z.string().trim().max(512).optional().default(""),
});

const LIST_ID = "homepage-native";
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = newsletterSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { email, sourcePath } = parsed.data;
  const db = getDb();
  const cutoff = new Date(Date.now() - DEDUPE_WINDOW_MS);

  const [existing] = await db
    .select({
      id: mailchimpSignupEvents.id,
    })
    .from(mailchimpSignupEvents)
    .where(
      and(
        eq(mailchimpSignupEvents.email, email),
        eq(mailchimpSignupEvents.eventType, "subscribe"),
        eq(mailchimpSignupEvents.listId, LIST_ID),
        gte(mailchimpSignupEvents.occurredAt, cutoff),
      ),
    )
    .limit(1);

  if (existing) {
    return NextResponse.json({
      ok: true,
      signupEventId: existing.id,
      deduped: true,
    });
  }

  const occurredAt = new Date();
  const eventKey = ["subscribe", LIST_ID, email.toLowerCase(), occurredAt.toISOString()].join(":");

  const [signupEvent] = await db
    .insert(mailchimpSignupEvents)
    .values({
      eventKey,
      listId: LIST_ID,
      eventType: "subscribe",
      email,
      firstName: "",
      lastName: "",
      payloadJson: {
        email,
        sourcePath,
        source: "native_homepage_form",
      },
      occurredAt,
    })
    .returning();

  if (!signupEvent) {
    throw new Error("Failed to store newsletter signup");
  }

  const category = getCategoryForMailchimpSignup();
  const [existingInbox] = await db
    .select({ id: adminInboxEvents.id })
    .from(adminInboxEvents)
    .where(
      and(
        eq(adminInboxEvents.sourceType, "mailchimp_signup"),
        eq(adminInboxEvents.sourceId, String(signupEvent.id)),
      ),
    )
    .limit(1);

  const inboxEvent =
    existingInbox
      ? null
      : await createAdminInboxEvent({
          sourceType: "mailchimp_signup",
          category,
          sourceId: String(signupEvent.id),
          title: `${getCategoryLabel(category)}: subscribe`,
          submitterName: "",
          submitterEmail: email,
          submitterPhone: "",
          summary: sourcePath ? `${sourcePath}: ${email} subscribed from the homepage form.` : `${email} subscribed from the homepage form.`,
          payloadJson: {
            signupEventId: signupEvent.id,
            email,
            sourcePath,
            eventType: "subscribe",
            listId: LIST_ID,
          },
        });

  if (inboxEvent) {
    await sendAdminInboxAlerts({
      event: inboxEvent,
      category,
      siteOrigin: resolveSiteOriginFromRequest(request),
    });
  }

  return NextResponse.json(
    {
      ok: true,
      signupEventId: signupEvent.id,
    },
    { status: 201 },
  );
}
