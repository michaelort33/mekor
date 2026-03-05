import assert from "node:assert/strict";
import test from "node:test";

import { normalizeEventSignupSettings } from "../lib/events/signup-settings";

test("normalizeEventSignupSettings applies defaults for missing row", () => {
  const normalized = normalizeEventSignupSettings(null);

  assert.equal(normalized.id, null);
  assert.equal(normalized.enabled, true);
  assert.equal(normalized.capacity, null);
  assert.equal(normalized.waitlistEnabled, false);
  assert.equal(normalized.paymentRequired, false);
  assert.equal(normalized.registrationDeadline, null);
  assert.equal(normalized.organizerEmail, "");
});

test("normalizeEventSignupSettings preserves explicit row values", () => {
  const deadline = new Date("2026-03-10T12:00:00.000Z");
  const normalized = normalizeEventSignupSettings({
    id: 8,
    enabled: false,
    capacity: 150,
    waitlistEnabled: true,
    paymentRequired: true,
    registrationDeadline: deadline,
    organizerEmail: "events@mekorhabracha.org",
  });

  assert.equal(normalized.id, 8);
  assert.equal(normalized.enabled, false);
  assert.equal(normalized.capacity, 150);
  assert.equal(normalized.waitlistEnabled, true);
  assert.equal(normalized.paymentRequired, true);
  assert.equal(normalized.registrationDeadline, deadline);
  assert.equal(normalized.organizerEmail, "events@mekorhabracha.org");
});
