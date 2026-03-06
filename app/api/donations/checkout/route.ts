import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { paymentCampaigns, paymentsLedger } from "@/db/schema";
import { recordPayment } from "@/lib/payments/service";
import { getStripeClient } from "@/lib/stripe/client";

const checkoutSchema = z.object({
  amountCents: z.number().int().min(100),
  designation: z.string().trim().max(180).default("General donation"),
  donorName: z.string().trim().min(1).max(180),
  donorEmail: z.string().trim().email().max(255),
  donorPhone: z.string().trim().max(60).default(""),
  campaignId: z.number().int().min(1).nullable().default(null),
  kind: z.enum(["donation", "campaign_donation", "membership_dues"]).default("donation"),
  returnPath: z.string().trim().max(255).default("/donations"),
});

export async function POST(request: Request) {
  const parsed = checkoutSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const origin = new URL(request.url).origin;
  const campaign =
    parsed.data.campaignId == null
      ? null
      : (
          await db
            .select({
              id: paymentCampaigns.id,
              title: paymentCampaigns.title,
              designationLabel: paymentCampaigns.designationLabel,
            })
            .from(paymentCampaigns)
            .where(eq(paymentCampaigns.id, parsed.data.campaignId))
            .limit(1)
        )[0] ?? null;

  const designation = campaign?.designationLabel || parsed.data.designation;
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: parsed.data.donorEmail,
    success_url: `${origin}${parsed.data.returnPath}?checkout=success`,
    cancel_url: `${origin}${parsed.data.returnPath}?checkout=cancel`,
    payment_method_types: ["card", "us_bank_account"],
    metadata: {
      kind: "donation",
      donationKind: parsed.data.kind,
      campaignId: campaign ? String(campaign.id) : "",
      designation,
      donorName: parsed.data.donorName,
      donorEmail: parsed.data.donorEmail,
      donorPhone: parsed.data.donorPhone,
    },
    payment_intent_data: {
      metadata: {
        kind: "donation",
        donationKind: parsed.data.kind,
        campaignId: campaign ? String(campaign.id) : "",
        designation,
        donorName: parsed.data.donorName,
        donorEmail: parsed.data.donorEmail,
        donorPhone: parsed.data.donorPhone,
      },
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: parsed.data.amountCents,
          product_data: {
            name: campaign?.title || designation,
            description: designation,
          },
        },
      },
    ],
  });

  const payment = await recordPayment({
    source: "stripe",
    sourceLabel: "Stripe Checkout",
    externalPaymentId: session.id,
    status: "pending",
    kind: parsed.data.kind,
    amountCents: parsed.data.amountCents,
    designation,
    payerDisplayName: parsed.data.donorName,
    payerEmail: parsed.data.donorEmail,
    payerPhone: parsed.data.donorPhone,
    campaignId: campaign?.id ?? null,
    paidAt: new Date(),
    createGuestIfMissing: true,
    metadata: {
      checkoutSessionId: session.id,
      returnPath: parsed.data.returnPath,
    },
  });

  await stripe.checkout.sessions.update(session.id, {
    metadata: {
      ...session.metadata,
      paymentLedgerId: String(payment.id),
    },
  });

  await db
    .update(paymentsLedger)
    .set({
      metadataJson: {
        checkoutSessionId: session.id,
        returnPath: parsed.data.returnPath,
        paymentLedgerId: payment.id,
      },
      updatedAt: new Date(),
    })
    .where(eq(paymentsLedger.id, payment.id));

  return NextResponse.json({ url: session.url, paymentId: payment.id });
}
