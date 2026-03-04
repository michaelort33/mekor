import assert from "node:assert/strict";
import test from "node:test";

import {
  countActiveEventSpots,
  isEventReminderDue,
  pickNextWaitlistedRegistration,
} from "../lib/events/registrations";

test("countActiveEventSpots counts registered and payment_pending statuses", () => {
  const count = countActiveEventSpots([
    { id: 1, status: "registered", registeredAt: new Date("2026-03-03T10:00:00.000Z") },
    { id: 2, status: "waitlisted", registeredAt: new Date("2026-03-03T10:01:00.000Z") },
    { id: 3, status: "payment_pending", registeredAt: new Date("2026-03-03T10:02:00.000Z") },
    { id: 4, status: "cancelled", registeredAt: new Date("2026-03-03T10:03:00.000Z") },
  ]);

  assert.equal(count, 2);
});

test("pickNextWaitlistedRegistration picks earliest waitlisted registration", () => {
  const picked = pickNextWaitlistedRegistration([
    { id: 10, status: "waitlisted", registeredAt: new Date("2026-03-03T10:30:00.000Z") },
    { id: 11, status: "waitlisted", registeredAt: new Date("2026-03-03T10:00:00.000Z") },
    { id: 12, status: "cancelled", registeredAt: new Date("2026-03-03T09:00:00.000Z") },
  ]);

  assert.equal(picked?.id, 11);
});

test("isEventReminderDue checks 24-hour window", () => {
  const now = new Date("2026-03-03T10:00:00.000Z");

  assert.equal(
    isEventReminderDue({
      now,
      startAt: new Date("2026-03-04T09:30:00.000Z"),
    }),
    true,
  );

  assert.equal(
    isEventReminderDue({
      now,
      startAt: new Date("2026-03-05T09:30:00.000Z"),
    }),
    false,
  );
});
