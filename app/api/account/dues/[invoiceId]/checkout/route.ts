import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { duesInvoices, duesPayments, users } from "@/db/schema";
import { getUserSession } from "@/lib/auth/session";
import { featureDisabledResponse, isFeatureEnabled } from "@/lib/config/features";
import { getOrCreateStripeCustomer } from "@/lib/stripe/customers";
import { getStripeClient } from "@/lib/stripe/client";

type Params = {
  params: Promise<{ invoiceId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  if (!(await isFeatureEnabled("FEATURE_DUES"))) {
    return NextResponse.json(featureDisabledResponse("FEATURE_DUES"), { status: 404 });
  }

  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { invoiceId } = await params;
  const numericInvoiceId = Number(invoiceId);
  if (!Number.isInteger(numericInvoiceId) || numericInvoiceId < 1) {
    return NextResponse.json({ error: "Invalid invoice id" }, { status: 400 });
  }

  const db = getDb();
  const [invoice] = await db
    .select({
      id: duesInvoices.id,
      userId: duesInvoices.userId,
      label: duesInvoices.label,
      amountCents: duesInvoices.amountCents,
      currency: duesInvoices.currency,
      status: duesInvoices.status,
    })
    .from(duesInvoices)
    .where(
      and(
        eq(duesInvoices.id, numericInvoiceId),
        eq(duesInvoices.userId, session.userId),
        inArray(duesInvoices.status, ["open", "overdue"]),
      ),
    )
    .limit(1);

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
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
  const sessionResponse = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: stripeCustomerId,
    success_url: `${origin}/account/dues?checkout=success`,
    cancel_url: `${origin}/account/dues?checkout=cancel`,
    payment_method_types: ["card", "us_bank_account"],
    payment_intent_data: {
      metadata: {
        kind: "dues",
        invoiceId: String(invoice.id),
        userId: String(user.id),
      },
    },
    metadata: {
      kind: "dues",
      invoiceId: String(invoice.id),
      userId: String(user.id),
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: invoice.currency,
          unit_amount: invoice.amountCents,
          product_data: {
            name: invoice.label,
          },
        },
      },
    ],
  });

  await db
    .update(duesInvoices)
    .set({
      stripeCheckoutSessionId: sessionResponse.id,
      updatedAt: new Date(),
    })
    .where(eq(duesInvoices.id, invoice.id));

  await db.insert(duesPayments).values({
    userId: user.id,
    invoiceId: invoice.id,
    amountCents: invoice.amountCents,
    currency: invoice.currency,
    status: "pending",
    stripeCheckoutSessionId: sessionResponse.id,
    updatedAt: new Date(),
  });

  return NextResponse.json({ url: sessionResponse.url });
}
