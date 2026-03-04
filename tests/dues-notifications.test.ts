import assert from "node:assert/strict";
import test from "node:test";

import { reminderTypeToDuesNotificationType } from "../lib/dues/notifications";

test("reminder type maps to dues notification type", () => {
  assert.equal(reminderTypeToDuesNotificationType("d30"), "overdue_d30");
  assert.equal(reminderTypeToDuesNotificationType("d7"), "overdue_d7");
  assert.equal(reminderTypeToDuesNotificationType("d1"), "overdue_d1");
  assert.equal(reminderTypeToDuesNotificationType("overdue_weekly"), "overdue_weekly");
});
