import assert from "node:assert/strict";
import test from "node:test";

import { getStripeRestrictedKey } from "@/lib/stripe/client";

test("Stripe uses the restricted server key", () => {
  const originalValue = process.env.STRIPE_RESTRICTED_KEY;
  process.env.STRIPE_RESTRICTED_KEY = "rk_test_mekor";

  try {
    assert.equal(getStripeRestrictedKey(), "rk_test_mekor");
  } finally {
    if (originalValue === undefined) {
      delete process.env.STRIPE_RESTRICTED_KEY;
    } else {
      process.env.STRIPE_RESTRICTED_KEY = originalValue;
    }
  }
});

test("Stripe fails fast without the restricted server key", () => {
  const originalValue = process.env.STRIPE_RESTRICTED_KEY;
  delete process.env.STRIPE_RESTRICTED_KEY;

  try {
    assert.throws(() => getStripeRestrictedKey(), /STRIPE_RESTRICTED_KEY is required/);
  } finally {
    if (originalValue === undefined) {
      delete process.env.STRIPE_RESTRICTED_KEY;
    } else {
      process.env.STRIPE_RESTRICTED_KEY = originalValue;
    }
  }
});
