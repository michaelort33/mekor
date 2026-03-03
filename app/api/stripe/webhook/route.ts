import { and, asc, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getDb } from "@/db/client";
import { duesInvoices, duesPayments, eventRegistrations } from "@/db/schema";
import { pickNextWaitlistedRegistration } from "@/lib/events/registrations";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe/client";

function getMetadata(value: Stripe.Checkout.Session | Stripe.PaymentIntent) {
  return value.metadata ?? {};
}

async function handleDuesCheckoutCompleted(session: Stripe.Checkout.Session) {
  const metadata = getMetadata(session);
  const invoiceId = Number(metadata.invoiceId);
  if (!Number.isInteger(invoiceId) || invoiceId < 1) return;

  const db = getDb();
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  await db
    .update(duesInvoices)
    .set({
      status: "paid",
      paidAt: new Date(),
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
      updatedAt: new Date(),
    })
    .where(eq(duesInvoices.id, invoiceId));

  const [latestPayment] = await db
    .select({ id: duesPayments.id })
    .from(duesPayments)
    .where(and(eq(duesPayments.invoiceId, invoiceId), eq(duesPayments.stripeCheckoutSessionId, session.id)))
    .orderBy(desc(duesPayments.createdAt))
    .limit(1);

  if (latestPayment) {
    await db
      .update(duesPayments)
      .set({
        status: "succeeded",
        stripePaymentIntentId: paymentIntentId,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(duesPayments.id, latestPayment.id));
  }
}

async function promoteNextWaitlisted(eventId: number) {
  const db = getDb();
  const waitlisted = await db
    .select({
      id: eventRegistrations.id,
      status: eventRegistrations.status,
      registeredAt: eventRegistrations.registeredAt,
    })
    .from(eventRegistrations)
    .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, "waitlisted")))
    .orderBy(asc(eventRegistrations.registeredAt));

  const next = pickNextWaitlistedRegistration(waitlisted);
  if (!next) return;

  await db
    .update(eventRegistrations)
    .set({
      status: "registered",
      updatedAt: new Date(),
    })
    .where(eq(eventRegistrations.id, next.id));
}

async function handleEventCheckoutCompleted(session: Stripe.Checkout.Session) {
  const metadata = getMetadata(session);
  const registrationId = Number(metadata.registrationId);
  if (!Number.isInteger(registrationId) || registrationId < 1) return;

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  await getDb()
    .update(eventRegistrations)
    .set({
      status: "registered",
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
      updatedAt: new Date(),
    })
    .where(eq(eventRegistrations.id, registrationId));
}

async function handleEventCheckoutExpired(session: Stripe.Checkout.Session) {
  const metadata = getMetadata(session);
  const registrationId = Number(metadata.registrationId);
  const eventId = Number(metadata.eventId);
  if (!Number.isInteger(registrationId) || registrationId < 1) return;

  await getDb()
    .update(eventRegistrations)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(eventRegistrations.id, registrationId));

  if (Number.isInteger(eventId) && eventId > 0) {
    await promoteNextWaitlisted(eventId);
  }
}

async function handleDuesCheckoutExpired(session: Stripe.Checkout.Session) {
  const metadata = getMetadata(session);
  const invoiceId = Number(metadata.invoiceId);
  if (!Number.isInteger(invoiceId) || invoiceId < 1) return;

  const db = getDb();
  const [latestPayment] = await db
    .select({ id: duesPayments.id })
    .from(duesPayments)
    .where(and(eq(duesPayments.invoiceId, invoiceId), eq(duesPayments.stripeCheckoutSessionId, session.id)))
    .orderBy(desc(duesPayments.createdAt))
    .limit(1);

  if (!latestPayment) return;

  await db
    .update(duesPayments)
    .set({
      status: "failed",
      processedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(duesPayments.id, latestPayment.id));
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const metadata = getMetadata(paymentIntent);
  if (metadata.kind !== "dues") return;
  const invoiceId = Number(metadata.invoiceId);
  if (!Number.isInteger(invoiceId) || invoiceId < 1) return;

  const db = getDb();
  const [latestPayment] = await db
    .select({ id: duesPayments.id })
    .from(duesPayments)
    .where(eq(duesPayments.invoiceId, invoiceId))
    .orderBy(desc(duesPayments.createdAt))
    .limit(1);

  if (latestPayment) {
    await db
      .update(duesPayments)
      .set({
        status: "failed",
        stripePaymentIntentId: paymentIntent.id,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(duesPayments.id, latestPayment.id));
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const payload = await request.text();
  const stripe = getStripeClient();
  const event = stripe.webhooks.constructEvent(payload, signature, getStripeWebhookSecret());

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const kind = session.metadata?.kind;
    if (kind === "dues") {
      await handleDuesCheckoutCompleted(session);
    }
    if (kind === "event") {
      await handleEventCheckoutCompleted(session);
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    if (session.metadata?.kind === "dues") {
      await handleDuesCheckoutExpired(session);
    }
    if (session.metadata?.kind === "event") {
      await handleEventCheckoutExpired(session);
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    await handlePaymentIntentFailed(event.data.object);
  }

  return NextResponse.json({ ok: true });
}
