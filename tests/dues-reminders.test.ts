import assert from "node:assert/strict";
import test from "node:test";

import { daysUntilDue, dueReminderTypeForDate } from "../lib/dues/reminders";

test("daysUntilDue computes day deltas in UTC", () => {
  assert.equal(
    daysUntilDue({
      dueDate: new Date("2026-04-02T12:00:00.000Z"),
      now: new Date("2026-03-03T01:00:00.000Z"),
    }),
    30,
  );
});

test("dueReminderTypeForDate matches 30/7/1 and weekly overdue windows", () => {
  assert.equal(
    dueReminderTypeForDate({
      dueDate: new Date("2026-04-02T00:00:00.000Z"),
      now: new Date("2026-03-03T00:00:00.000Z"),
    }),
    "d30",
  );

  assert.equal(
    dueReminderTypeForDate({
      dueDate: new Date("2026-03-10T00:00:00.000Z"),
      now: new Date("2026-03-03T00:00:00.000Z"),
    }),
    "d7",
  );

  assert.equal(
    dueReminderTypeForDate({
      dueDate: new Date("2026-03-04T00:00:00.000Z"),
      now: new Date("2026-03-03T00:00:00.000Z"),
    }),
    "d1",
  );

  assert.equal(
    dueReminderTypeForDate({
      dueDate: new Date("2026-02-24T00:00:00.000Z"),
      now: new Date("2026-03-03T00:00:00.000Z"),
    }),
    "overdue_weekly",
  );

  assert.equal(
    dueReminderTypeForDate({
      dueDate: new Date("2026-02-25T00:00:00.000Z"),
      now: new Date("2026-03-03T00:00:00.000Z"),
    }),
    null,
  );
});
