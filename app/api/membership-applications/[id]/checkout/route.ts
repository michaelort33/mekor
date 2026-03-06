import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { membershipApplications, paymentsLedger } from "@/db/schema";
import { recordPayment } from "@/lib/payments/service";
import { getStripeClient } from "@/lib/stripe/client";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const applicationId = Number(id);
  if (!Number.isInteger(applicationId) || applicationId < 1) {
    return NextResponse.json({ error: "Invalid application id" }, { status: 400 });
  }

  const [application] = await getDb()
    .select({
      id: membershipApplications.id,
      status: membershipApplications.status,
      displayName: membershipApplications.displayName,
      email: membershipApplications.email,
      phone: membershipApplications.phone,
      totalAmountCents: membershipApplications.totalAmountCents,
      membershipCategory: membershipApplications.membershipCategory,
      includeSecurityDonation: membershipApplications.includeSecurityDonation,
    })
    .from(membershipApplications)
    .where(eq(membershipApplications.id, applicationId))
    .limit(1);

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: application.email,
    success_url: `${origin}/membership/apply?checkout=success&applicationId=${application.id}`,
    cancel_url: `${origin}/membership/apply?checkout=cancel&applicationId=${application.id}`,
    payment_method_types: ["card", "us_bank_account"],
    metadata: {
      kind: "donation",
      donationKind: "membership_dues",
      membershipApplicationId: String(application.id),
      donorName: application.displayName,
      donorEmail: application.email,
      donorPhone: application.phone,
      designation: application.includeSecurityDonation ? "Membership dues + security donation" : "Membership dues",
    },
    payment_intent_data: {
      metadata: {
        kind: "donation",
        donationKind: "membership_dues",
        membershipApplicationId: String(application.id),
        donorName: application.displayName,
        donorEmail: application.email,
        donorPhone: application.phone,
        designation: application.includeSecurityDonation ? "Membership dues + security donation" : "Membership dues",
      },
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: application.totalAmountCents,
          product_data: {
            name: "Membership payment",
            description: `${application.membershipCategory} application`,
          },
        },
      },
    ],
  });

  const payment = await recordPayment({
    source: "stripe",
    sourceLabel: "Membership application checkout",
    externalPaymentId: session.id,
    status: "pending",
    kind: "membership_dues",
    amountCents: application.totalAmountCents,
    designation: application.includeSecurityDonation ? "Membership dues + security donation" : "Membership dues",
    payerDisplayName: application.displayName,
    payerEmail: application.email,
    payerPhone: application.phone,
    membershipApplicationId: application.id,
    paidAt: new Date(),
    createGuestIfMissing: true,
    metadata: {
      checkoutSessionId: session.id,
      applicationId: application.id,
    },
  });

  await stripe.checkout.sessions.update(session.id, {
    metadata: {
      ...session.metadata,
      paymentLedgerId: String(payment.id),
    },
  });

  await getDb()
    .update(paymentsLedger)
    .set({
      metadataJson: {
        checkoutSessionId: session.id,
        applicationId: application.id,
        paymentLedgerId: payment.id,
      },
      updatedAt: new Date(),
    })
    .where(eq(paymentsLedger.id, payment.id));

  return NextResponse.json({ url: session.url, paymentId: payment.id });
}
