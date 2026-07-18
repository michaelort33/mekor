import assert from "node:assert/strict";
import test from "node:test";

import { buildCampaignResultNotice } from "../lib/admin/send-feedback";
import { assertSafeNewsletterHtml } from "../lib/newsletter/html-sanitize";
import {
  partitionSelectedSubscriberIds,
  uniquePositiveIds,
} from "../lib/newsletter/selected-recipients";
import {
  bumpSaveGeneration,
  shouldResaveAfterPersist,
  shouldRunScheduledAutosave,
} from "../lib/newsletter/studio-autosave";

test("uniquePositiveIds dedupes and drops invalid ids", () => {
  assert.deepEqual(uniquePositiveIds([3, 1, 1, 0, -2, 2.5 as unknown as number, 2]), [3, 1, 2]);
});

test("partitionSelectedSubscriberIds keeps only weekly subscribed ids", () => {
  const result = partitionSelectedSubscriberIds([10, 11, 12, 10], [11, 99]);
  assert.deepEqual(result.allowedIds, [11]);
  assert.deepEqual(result.rejectedIds, [10, 12]);
});

test("assertSafeNewsletterHtml sanitizes scripted override bodies before send", () => {
  const html = assertSafeNewsletterHtml(
    `<div onclick="alert(1)"><script>bad()</script><p style="color:#123">Hi</p></div>`,
  );
  assert.equal(/<script/i.test(html), false);
  assert.equal(/onclick/i.test(html), false);
  assert.match(html, /Hi/);
});

test("assertSafeNewsletterHtml rejects empty override bodies", () => {
  assert.throws(() => assertSafeNewsletterHtml("   "), /empty/i);
});

test("assertSafeNewsletterHtml accepts safe override bodies", () => {
  const html = assertSafeNewsletterHtml(
    `<table style="width:100%"><tr><td style="color:#123">Shalom</td></tr></table>`,
  );
  assert.match(html, /Shalom/);
});

test("autosave skips stale scheduled generations", () => {
  assert.equal(
    shouldRunScheduledAutosave({
      scheduledGeneration: 1,
      currentGeneration: 2,
      scheduledHtml: "<p>old</p>",
      currentHtml: "<p>old</p>",
    }),
    false,
  );
  assert.equal(
    shouldRunScheduledAutosave({
      scheduledGeneration: 3,
      currentGeneration: 3,
      scheduledHtml: "<p>same</p>",
      currentHtml: "<p>same</p>",
    }),
    true,
  );
  assert.equal(
    shouldRunScheduledAutosave({
      scheduledGeneration: 3,
      currentGeneration: 3,
      scheduledHtml: "<p>a</p>",
      currentHtml: "<p>b</p>",
    }),
    false,
  );
});

test("autosave resaves when editor moved during in-flight PUT", () => {
  assert.equal(
    shouldResaveAfterPersist({ attemptedHtml: "<p>a</p>", currentHtml: "<p>b</p>" }),
    true,
  );
  assert.equal(
    shouldResaveAfterPersist({ attemptedHtml: "<p>a</p>", currentHtml: "<p>a</p>" }),
    false,
  );
  assert.equal(bumpSaveGeneration(4), 5);
});

test("campaign notice handles preview and mid-batch sending", () => {
  const preview = buildCampaignResultNotice({ mode: "preview", recipientCount: 3 });
  assert.equal(preview.status, "info");
  assert.match(preview.message, /Preview ready for 3/);

  const sending = buildCampaignResultNotice({
    mode: "send",
    status: "sending",
    recipientCount: 80,
    campaignId: 9,
    successCount: 0,
    failedCount: 0,
  });
  assert.equal(sending.status, "info");
  assert.match(sending.message, /still sending/);
  assert.match(sending.message, /#9/);

  const done = buildCampaignResultNotice({
    mode: "send",
    status: "completed",
    successCount: 2,
    failedCount: 0,
    skippedCount: 0,
  });
  assert.equal(done.status, "success");
});
