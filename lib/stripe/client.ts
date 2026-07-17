import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripeRestrictedKey() {
  const value = process.env.STRIPE_RESTRICTED_KEY;
  if (!value) {
    throw new Error("STRIPE_RESTRICTED_KEY is required");
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
    stripe = new Stripe(getStripeRestrictedKey());
  }

  return stripe;
}
