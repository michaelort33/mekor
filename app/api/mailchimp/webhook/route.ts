import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { adminInboxEvents, mailchimpSignupEvents } from "@/db/schema";
import {
  createAdminInboxEvent,
  getCategoryForMailchimpSignup,
  getCategoryLabel,
} from "@/lib/admin/inbox";
import { sendAdminInboxAlerts } from "@/lib/notifications/admin-alerts";
import { resolveSiteOriginFromRequest } from "@/lib/site-origin";

type MailchimpEventType = "subscribe" | "profile" | "upemail" | "cleaned" | "unsubscribe";

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOccurredAt(raw: string) {
  const parsed = raw ? new Date(raw) : new Date();
  return Number.isNaN(parsed.valueOf()) ? new Date() : parsed;
}

function normalizeMailchimpPayload(input: Record<string, string>) {
  const eventType = (input.type || "").trim() as MailchimpEventType;
  const email = input["data[email]"] || input.email || "";
  const firstName = input["data[merges][FNAME]"] || input["merges[FNAME]"] || "";
  const lastName = input["data[merges][LNAME]"] || input["merges[LNAME]"] || "";
  const listId = input["data[list_id]"] || input.list_id || "";
  const firedAtRaw = input.fired_at || input["fired_at"] || "";
  const occurredAt = normalizeOccurredAt(firedAtRaw);
  const eventKey = [eventType, listId, email.toLowerCase(), occurredAt.toISOString()].join(":");

  return {
    eventType,
    email,
    firstName,
    lastName,
    listId,
    occurredAt,
    eventKey,
  };
}

async function readWebhookPayload(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const parsed = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, typeof value === "string" ? value : JSON.stringify(value)]),
    );
  }

  const formData = await request.formData();
  return Object.fromEntries(Array.from(formData.entries()).map(([key, value]) => [key, stringValue(value)]));
}

function shouldCreateInboxEvent(eventType: MailchimpEventType) {
  return eventType === "subscribe" || eventType === "profile" || eventType === "upemail";
}

export async function GET() {
  return new NextResponse("ok", { status: 200 });
}

export async function POST(request: Request) {
  const rawPayload = await readWebhookPayload(request);
  const normalized = normalizeMailchimpPayload(rawPayload);
  if (!normalized.eventType || !normalized.email) {
    return NextResponse.json({ error: "Invalid Mailchimp webhook payload" }, { status: 400 });
  }

  const db = getDb();
  const [existing] = await db
    .select({
      id: mailchimpSignupEvents.id,
    })
    .from(mailchimpSignupEvents)
    .where(eq(mailchimpSignupEvents.eventKey, normalized.eventKey))
    .limit(1);

  if (existing) {
    return NextResponse.json({ ok: true, deduped: true, eventId: existing.id });
  }

  const [signupEvent] = await db
    .insert(mailchimpSignupEvents)
    .values({
      eventKey: normalized.eventKey,
      listId: normalized.listId,
      eventType: normalized.eventType,
      email: normalized.email,
      firstName: normalized.firstName,
      lastName: normalized.lastName,
      payloadJson: rawPayload,
      occurredAt: normalized.occurredAt,
    })
    .returning();

  if (!signupEvent) {
    throw new Error("Failed to store Mailchimp signup event");
  }

  let inboxEventId: number | null = null;
  if (shouldCreateInboxEvent(normalized.eventType)) {
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
            title: `${getCategoryLabel(category)}: ${normalized.eventType}`,
            submitterName: [normalized.firstName, normalized.lastName].filter(Boolean).join(" "),
            submitterEmail: normalized.email,
            submitterPhone: "",
            summary: `${normalized.email} triggered Mailchimp event "${normalized.eventType}" for audience ${normalized.listId || "unknown"}.`,
            payloadJson: {
              signupEventId: signupEvent.id,
              eventType: normalized.eventType,
              listId: normalized.listId,
              email: normalized.email,
              firstName: normalized.firstName,
              lastName: normalized.lastName,
              occurredAt: normalized.occurredAt.toISOString(),
              rawPayload,
            },
          });

    if (inboxEvent) {
      inboxEventId = inboxEvent.id;
      await sendAdminInboxAlerts({
        event: inboxEvent,
        category,
        siteOrigin: resolveSiteOriginFromRequest(request),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    eventId: signupEvent.id,
    inboxEventId,
  });
}
