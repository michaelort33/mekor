import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripeSecretKey() {
  const value = process.env.STRIPE_SECRET_KEY;
  if (!value) {
    throw new Error("STRIPE_SECRET_KEY is required");
  }
  return value;
}

export function getStripeWebhookSecret() {
  const value = process.env.STRIPE_WEBHOOK_SECRET;
  if (!value) {
    throw new Error("STRIPE_WEBHOOK_SECRET is required");
  }
  return value;
}

export function getStripeClient() {
  if (!stripe) {
    stripe = new Stripe(getStripeSecretKey());
  }

  return stripe;
}
