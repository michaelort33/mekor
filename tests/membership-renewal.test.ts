import assert from "node:assert/strict";
import test from "node:test";

import { daysUntilRenewal, shouldSendRenewalReminder } from "../lib/membership/renewal-messages";

test("daysUntilRenewal computes full-day UTC delta", () => {
  const now = new Date("2026-03-04T15:30:00.000Z");
  const renewalDate = new Date("2026-03-11T01:00:00.000Z");

  assert.equal(daysUntilRenewal({ now, renewalDate }), 7);
});

test("shouldSendRenewalReminder only matches exactly 7 days before", () => {
  const now = new Date("2026-03-04T00:00:00.000Z");
  assert.equal(
    shouldSendRenewalReminder({
      now,
      renewalDate: new Date("2026-03-11T00:00:00.000Z"),
    }),
    true,
  );
  assert.equal(
    shouldSendRenewalReminder({
      now,
      renewalDate: new Date("2026-03-10T00:00:00.000Z"),
    }),
    false,
  );
});
