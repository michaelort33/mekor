import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { invoiceOutstandingCents } from "../lib/member-ops/dues";
import { isRenewalTransitionAllowed } from "../lib/member-ops/renewals";
import { resolveVolunteerSignupStatus } from "../lib/member-ops/volunteer";

async function read(relativePath: string) {
  return fs.readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("renewal status transition guard accepts only configured transitions", () => {
  assert.equal(isRenewalTransitionAllowed("invited", "form_submitted"), true);
  assert.equal(isRenewalTransitionAllowed("form_submitted", "payment_pending"), true);
  assert.equal(isRenewalTransitionAllowed("payment_pending", "active"), true);
  assert.equal(isRenewalTransitionAllowed("active", "invited"), false);
  assert.equal(isRenewalTransitionAllowed("not_started", "active"), false);
});

test("invoice outstanding amount handles partial and full payments", () => {
  assert.equal(invoiceOutstandingCents(200000, 0), 200000);
  assert.equal(invoiceOutstandingCents(200000, 50000), 150000);
  assert.equal(invoiceOutstandingCents(200000, 250000), 0);
});

test("volunteer signup status resolves to waitlisted when slot is full", () => {
  assert.equal(resolveVolunteerSignupStatus(0, 1), "confirmed");
  assert.equal(resolveVolunteerSignupStatus(1, 1), "waitlisted");
  assert.equal(resolveVolunteerSignupStatus(5, 3), "waitlisted");
});

test("communication preferences enforce member/channel uniqueness", async () => {
  const source = await read("db/schema.ts");
  assert.match(source, /communication_preferences_member_channel_unique/);
});

test("RSVP export endpoint uses required CSV column order", async () => {
  const source = await read("app/api/admin/events/rsvps-export.csv/route.ts");
  assert.match(
    source,
    /event_path,event_title,name,email,phone,attendee_count,note,created_at/,
  );
});

test("member connect relay requires approved moderation state", async () => {
  const source = await read("lib/member-ops/messaging.ts");
  assert.match(source, /request\.status !== "approved"/);
  assert.match(source, /Message request must be approved before relaying/);
});
