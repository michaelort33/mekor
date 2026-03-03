import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { eventRegistrations, eventTicketTiers, events, users } from "@/db/schema";
import { getUserSession } from "@/lib/auth/session";
import { featureDisabledResponse, isFeatureEnabled } from "@/lib/config/features";
import { getStripeClient } from "@/lib/stripe/client";
import { getOrCreateStripeCustomer } from "@/lib/stripe/customers";

type Params = {
  params: Promise<{ eventId: string }>;
};

const payloadSchema = z.object({
  registrationId: z.number().int().min(1),
});

export async function POST(request: Request, { params }: Params) {
  if (!isFeatureEnabled("FEATURE_EVENT_SIGNUPS")) {
    return NextResponse.json(featureDisabledResponse("FEATURE_EVENT_SIGNUPS"), { status: 404 });
  }

  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await params;
  const numericEventId = Number(eventId);
  if (!Number.isInteger(numericEventId) || numericEventId < 1) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const [registration] = await db
    .select({
      id: eventRegistrations.id,
      eventId: eventRegistrations.eventId,
      userId: eventRegistrations.userId,
      status: eventRegistrations.status,
      ticketTierId: eventRegistrations.ticketTierId,
    })
    .from(eventRegistrations)
    .where(
      and(
        eq(eventRegistrations.id, parsed.data.registrationId),
        eq(eventRegistrations.eventId, numericEventId),
        eq(eventRegistrations.userId, session.userId),
      ),
    )
    .limit(1);

  if (!registration || registration.status !== "payment_pending") {
    return NextResponse.json({ error: "Registration not payable" }, { status: 400 });
  }

  const [ticketTier] = await db
    .select({
      id: eventTicketTiers.id,
      name: eventTicketTiers.name,
      priceCents: eventTicketTiers.priceCents,
      currency: eventTicketTiers.currency,
    })
    .from(eventTicketTiers)
    .where(eq(eventTicketTiers.id, registration.ticketTierId ?? -1))
    .limit(1);

  if (!ticketTier || ticketTier.priceCents <= 0) {
    return NextResponse.json({ error: "Paid tier required" }, { status: 400 });
  }

  const [eventRow] = await db
    .select({
      id: events.id,
      title: events.title,
      path: events.path,
    })
    .from(events)
    .where(eq(events.id, numericEventId))
    .limit(1);

  if (!eventRow) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const stripeCustomerId = await getOrCreateStripeCustomer({
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
  });

  const origin = new URL(request.url).origin;
  const stripe = getStripeClient();
  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: stripeCustomerId,
    success_url: `${origin}${eventRow.path}?checkout=success`,
    cancel_url: `${origin}${eventRow.path}?checkout=cancel`,
    payment_method_types: ["card", "us_bank_account"],
    payment_intent_data: {
      metadata: {
        kind: "event",
        registrationId: String(registration.id),
        eventId: String(eventRow.id),
        userId: String(user.id),
      },
    },
    metadata: {
      kind: "event",
      registrationId: String(registration.id),
      eventId: String(eventRow.id),
      userId: String(user.id),
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: ticketTier.currency,
          unit_amount: ticketTier.priceCents,
          product_data: {
            name: `${eventRow.title} · ${ticketTier.name}`,
          },
        },
      },
    ],
  });

  await db
    .update(eventRegistrations)
    .set({
      stripeCheckoutSessionId: checkout.id,
      updatedAt: new Date(),
    })
    .where(eq(eventRegistrations.id, registration.id));

  return NextResponse.json({ url: checkout.url });
}
