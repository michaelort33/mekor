import assert from "node:assert/strict";
import test from "node:test";

import { resolveWaitlistPromotionState } from "../lib/events/waitlist";

test("waitlist promotion resolves free registration when no payment needed", () => {
  const result = resolveWaitlistPromotionState({
    paymentRequiredBySetting: false,
    tierPriceCents: 0,
  });

  assert.equal(result.paymentRequired, false);
  assert.equal(result.nextStatus, "registered");
});

test("waitlist promotion resolves payment pending when settings require payment", () => {
  const result = resolveWaitlistPromotionState({
    paymentRequiredBySetting: true,
    tierPriceCents: 0,
  });

  assert.equal(result.paymentRequired, true);
  assert.equal(result.nextStatus, "payment_pending");
});

test("waitlist promotion resolves payment pending when tier is paid", () => {
  const result = resolveWaitlistPromotionState({
    paymentRequiredBySetting: false,
    tierPriceCents: 2500,
  });

  assert.equal(result.paymentRequired, true);
  assert.equal(result.nextStatus, "payment_pending");
});
