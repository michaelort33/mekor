import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getDb } from "@/db/client";
import { duesInvoices, duesPayments, eventRegistrations, users } from "@/db/schema";
import { sendDuesNotification } from "@/lib/dues/notifications";
import { promoteWaitlistForEvent } from "@/lib/events/waitlist";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe/client";

function getMetadata(value: Stripe.Checkout.Session | Stripe.PaymentIntent) {
  return value.metadata ?? {};
}

async function handleDuesCheckoutCompleted(session: Stripe.Checkout.Session) {
  const metadata = getMetadata(session);
  const invoiceId = Number(metadata.invoiceId);
  if (!Number.isInteger(invoiceId) || invoiceId < 1) return;

  const db = getDb();
  const [invoice] = await db
    .select({
      id: duesInvoices.id,
      userId: duesInvoices.userId,
      label: duesInvoices.label,
      amountCents: duesInvoices.amountCents,
      currency: duesInvoices.currency,
      dueDate: duesInvoices.dueDate,
      status: duesInvoices.status,
      userEmail: users.email,
      userDisplayName: users.displayName,
    })
    .from(duesInvoices)
    .innerJoin(users, eq(users.id, duesInvoices.userId))
    .where(eq(duesInvoices.id, invoiceId))
    .limit(1);
  if (!invoice) return;

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
    .where(and(eq(duesInvoices.id, invoiceId), inArray(duesInvoices.status, ["open", "overdue"])));

  const [latestPayment] = await db
    .select({ id: duesPayments.id, status: duesPayments.status })
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

  await sendDuesNotification({
    referenceKey: `invoice:${invoice.id}:payment_succeeded`,
    userId: invoice.userId,
    userEmail: invoice.userEmail,
    displayName: invoice.userDisplayName,
    notificationType: "payment_succeeded",
    invoiceId: invoice.id,
    paymentId: latestPayment?.id ?? null,
    invoiceLabel: invoice.label,
    amountCents: invoice.amountCents,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
  });
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

  const [cancelled] = await getDb()
    .update(eventRegistrations)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(and(eq(eventRegistrations.id, registrationId), eq(eventRegistrations.status, "payment_pending")))
    .returning({ id: eventRegistrations.id });

  if (cancelled && Number.isInteger(eventId) && eventId > 0) {
    await promoteWaitlistForEvent(eventId);
  }
}

async function handleDuesCheckoutExpired(session: Stripe.Checkout.Session) {
  const metadata = getMetadata(session);
  const invoiceId = Number(metadata.invoiceId);
  if (!Number.isInteger(invoiceId) || invoiceId < 1) return;

  const db = getDb();
  const [invoice] = await db
    .select({
      id: duesInvoices.id,
      userId: duesInvoices.userId,
      label: duesInvoices.label,
      amountCents: duesInvoices.amountCents,
      currency: duesInvoices.currency,
      dueDate: duesInvoices.dueDate,
      userEmail: users.email,
      userDisplayName: users.displayName,
    })
    .from(duesInvoices)
    .innerJoin(users, eq(users.id, duesInvoices.userId))
    .where(eq(duesInvoices.id, invoiceId))
    .limit(1);
  if (!invoice) return;

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

  await sendDuesNotification({
    referenceKey: `payment:${latestPayment.id}:payment_failed`,
    userId: invoice.userId,
    userEmail: invoice.userEmail,
    displayName: invoice.userDisplayName,
    notificationType: "payment_failed",
    invoiceId: invoice.id,
    paymentId: latestPayment.id,
    invoiceLabel: invoice.label,
    amountCents: invoice.amountCents,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
  });
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const metadata = getMetadata(paymentIntent);
  if (metadata.kind !== "dues") return;
  const invoiceId = Number(metadata.invoiceId);
  if (!Number.isInteger(invoiceId) || invoiceId < 1) return;

  const db = getDb();
  const [latestPayment] = await db
    .select({
      id: duesPayments.id,
      userId: duesPayments.userId,
      invoiceLabel: duesInvoices.label,
      amountCents: duesInvoices.amountCents,
      currency: duesInvoices.currency,
      dueDate: duesInvoices.dueDate,
      userEmail: users.email,
      userDisplayName: users.displayName,
    })
    .from(duesPayments)
    .innerJoin(duesInvoices, eq(duesInvoices.id, duesPayments.invoiceId))
    .innerJoin(users, eq(users.id, duesPayments.userId))
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

    await sendDuesNotification({
      referenceKey: `payment:${latestPayment.id}:payment_failed`,
      userId: latestPayment.userId,
      userEmail: latestPayment.userEmail,
      displayName: latestPayment.userDisplayName,
      notificationType: "payment_failed",
      invoiceId,
      paymentId: latestPayment.id,
      invoiceLabel: latestPayment.invoiceLabel,
      amountCents: latestPayment.amountCents,
      currency: latestPayment.currency,
      dueDate: latestPayment.dueDate,
    });
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
