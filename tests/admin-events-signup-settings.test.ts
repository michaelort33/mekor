import assert from "node:assert/strict";
import test from "node:test";

import { toAdminEventSignupSettings } from "../lib/events/admin-signup-settings";

test("admin event signup settings mapper defaults unconfigured events", () => {
  const mapped = toAdminEventSignupSettings(
    {
      id: null,
      eventId: 12,
      eventTitle: "Purim",
      eventPath: "/events-1/purim",
      enabled: null,
      capacity: null,
      waitlistEnabled: null,
      paymentRequired: null,
      registrationDeadline: null,
      organizerEmail: null,
      updatedAt: null,
    },
    new Map(),
  );

  assert.equal(mapped.id, null);
  assert.equal(mapped.enabled, true);
  assert.equal(mapped.waitlistEnabled, false);
  assert.equal(mapped.paymentRequired, false);
  assert.deepEqual(mapped.tiers, []);
});

test("admin event signup settings mapper keeps explicit settings and tiers", () => {
  const tiers = [
    {
      id: 5,
      eventSignupSettingsId: 2,
      name: "General",
      priceCents: 1800,
      currency: "usd",
      active: true,
      sortOrder: 0,
    },
  ];
  const mapped = toAdminEventSignupSettings(
    {
      id: 2,
      eventId: 14,
      eventTitle: "Shabbat Dinner",
      eventPath: "/events-1/shabbat-dinner",
      enabled: false,
      capacity: 90,
      waitlistEnabled: true,
      paymentRequired: true,
      registrationDeadline: new Date("2026-03-08T10:00:00.000Z"),
      organizerEmail: "events@mekorhabracha.org",
      updatedAt: new Date("2026-03-01T10:00:00.000Z"),
    },
    new Map([[2, tiers]]),
  );

  assert.equal(mapped.id, 2);
  assert.equal(mapped.enabled, false);
  assert.equal(mapped.capacity, 90);
  assert.equal(mapped.waitlistEnabled, true);
  assert.equal(mapped.paymentRequired, true);
  assert.equal(mapped.organizerEmail, "events@mekorhabracha.org");
  assert.deepEqual(mapped.tiers, tiers);
});
