import assert from "node:assert/strict";
import test from "node:test";

import { buildDonationThankYouMessage, deriveTaxTreatment } from "@/lib/payments/shared";

test("kiddush donations are treated as deductible", () => {
  const result = deriveTaxTreatment({
    kind: "donation",
    designation: "Kiddush",
    amountCents: 36_000,
  });

  assert.equal(result.taxDeductibility, "deductible");
  assert.equal(result.deductibleAmountCents, 36_000);
});

test("meals and lulav payments are excluded from deductible reporting", () => {
  const meals = deriveTaxTreatment({
    kind: "donation",
    designation: "Meals",
    amountCents: 18_000,
  });
  const lulav = deriveTaxTreatment({
    kind: "donation",
    designation: "Lulav set",
    amountCents: 22_000,
  });

  assert.equal(meals.taxDeductibility, "non_deductible");
  assert.equal(meals.deductibleAmountCents, 0);
  assert.equal(lulav.taxDeductibility, "non_deductible");
  assert.equal(lulav.deductibleAmountCents, 0);
});

test("goods and services value makes a gift partially deductible", () => {
  const result = deriveTaxTreatment({
    kind: "campaign_donation",
    designation: "Holiday appeal dinner",
    amountCents: 50_000,
    goodsServicesValueCents: 12_000,
  });

  assert.equal(result.taxDeductibility, "partially_deductible");
  assert.equal(result.deductibleAmountCents, 38_000);
});

test("thank-you message is distinct from tax receipt language", () => {
  const message = buildDonationThankYouMessage({
    donorName: "Alex Donor",
    amountCents: 54_000,
    designation: "Building fund",
  });

  assert.match(message.subject, /thank you/i);
  assert.match(message.text, /separate tax receipt/i);
  assert.doesNotMatch(message.text, /no goods or services/i);
});
