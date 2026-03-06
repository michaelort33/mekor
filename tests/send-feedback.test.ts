import assert from "node:assert/strict";
import test from "node:test";

import { buildSendFeedback } from "@/lib/admin/send-feedback";

test("send feedback reports failure when all deliveries fail", () => {
  const feedback = buildSendFeedback({
    label: "Campaign",
    successCount: 0,
    failedCount: 5,
    skippedCount: 0,
  });

  assert.equal(feedback.status, "failure");
  assert.match(feedback.message, /Campaign failed/);
});

test("send feedback reports partial when some deliveries fail or skip", () => {
  const partialFailure = buildSendFeedback({
    label: "Campaign",
    successCount: 3,
    failedCount: 2,
    skippedCount: 1,
  });
  assert.equal(partialFailure.status, "partial");

  const skippedOnly = buildSendFeedback({
    label: "Message",
    successCount: 0,
    failedCount: 0,
    skippedCount: 1,
  });
  assert.equal(skippedOnly.status, "partial");
  assert.match(skippedOnly.message, /delivered to no one/);
});

test("send feedback reports success when all deliveries succeed", () => {
  const feedback = buildSendFeedback({
    label: "Campaign",
    successCount: 4,
    failedCount: 0,
    skippedCount: 0,
  });

  assert.equal(feedback.status, "success");
  assert.match(feedback.message, /Campaign sent/);
});
