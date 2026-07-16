import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { messageDeliveries, newsletterDeliveryEvents } from "@/db/schema";
import { reconcileMessageCampaign } from "@/lib/messages/service";
import { sendGridEventKey, verifySendGridEventSignature } from "@/lib/newsletter/sendgrid-events";
import { syncNewsletterSubscriptionEvent } from "@/lib/newsletter/subscriptions";

type SendGridEvent = Record<string, unknown> & {
  event?: string;
  email?: string;
  timestamp?: number;
  sg_message_id?: string;
  delivery_id?: string;
};

export async function POST(request: Request) {
  const payload = await request.text();
  const publicKey = process.env.SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY || "";
  const timestamp = request.headers.get("x-twilio-email-event-webhook-timestamp") || "";
  const signature = request.headers.get("x-twilio-email-event-webhook-signature") || "";
  if (!verifySendGridEventSignature({ payload, timestamp, signature, publicKey })) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }
  const events = JSON.parse(payload) as SendGridEvent[];
  if (!Array.isArray(events)) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  let accepted = 0;
  for (const event of events) {
    const eventType = String(event.event || "");
    const recipientEmail = String(event.email || "").trim().toLowerCase();
    if (!eventType) continue;
    const occurredAt = new Date((Number(event.timestamp) || Math.floor(Date.now() / 1000)) * 1000);
    const deliveryId = Number(event.delivery_id);
    const [inserted] = await getDb()
      .insert(newsletterDeliveryEvents)
      .values({
        deliveryId: Number.isInteger(deliveryId) && deliveryId > 0 ? deliveryId : null,
        providerMessageId: String(event.sg_message_id || ""),
        recipientEmail,
        eventType,
        eventKey: sendGridEventKey(event),
        payloadJson: event,
        occurredAt,
      })
      .onConflictDoNothing()
      .returning({ id: newsletterDeliveryEvents.id });
    if (!inserted) continue;
    accepted += 1;

    if (Number.isInteger(deliveryId) && deliveryId > 0 && ["processed", "delivered"].includes(eventType)) {
      await getDb()
        .update(messageDeliveries)
        .set({ providerMessageId: String(event.sg_message_id || ""), status: "sent", sentAt: occurredAt, updatedAt: new Date() })
        .where(and(eq(messageDeliveries.id, deliveryId), inArray(messageDeliveries.status, ["processing", "sent"])));
      const [delivery] = await getDb().select({ campaignId: messageDeliveries.campaignId }).from(messageDeliveries).where(eq(messageDeliveries.id, deliveryId)).limit(1);
      if (delivery) await reconcileMessageCampaign(delivery.campaignId);
    }
    if (Number.isInteger(deliveryId) && deliveryId > 0 && ["bounce", "dropped", "spamreport"].includes(eventType)) {
      const [delivery] = await getDb().select({ campaignId: messageDeliveries.campaignId }).from(messageDeliveries).where(eq(messageDeliveries.id, deliveryId)).limit(1);
      await getDb()
        .update(messageDeliveries)
        .set({ status: "failed", errorMessage: `SendGrid ${eventType}`, updatedAt: new Date() })
        .where(and(eq(messageDeliveries.id, deliveryId), inArray(messageDeliveries.status, ["processing", "sent", "failed"])));
      if (delivery) await reconcileMessageCampaign(delivery.campaignId);
    }
    const subscriptionStatus =
      eventType === "spamreport"
        ? "complained"
        : eventType === "bounce" || eventType === "dropped"
          ? "bounced"
          : eventType === "unsubscribe" || eventType === "group_unsubscribe"
            ? "unsubscribed"
            : null;
    if (subscriptionStatus && recipientEmail) {
      await syncNewsletterSubscriptionEvent({
        email: recipientEmail,
        source: "sendgrid_event_webhook",
        status: subscriptionStatus,
        occurredAt,
      });
    }
  }
  return NextResponse.json({ ok: true, accepted });
}
