import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { sendGridEventKey, verifySendGridEventSignature } from "@/lib/newsletter/sendgrid-events";
import { buildUnsubscribeUrl, normalizeNewsletterEmail } from "@/lib/newsletter/subscriptions";

test("newsletter addresses and unsubscribe links are normalized", () => {
  assert.equal(normalizeNewsletterEmail("  Person@Example.COM "), "person@example.com");
  assert.equal(
    buildUnsubscribeUrl("https://www.mekorhabracha.org", "token with spaces"),
    "https://www.mekorhabracha.org/api/newsletter/unsubscribe?token=token%20with%20spaces",
  );
});

test("SendGrid event webhook signatures are verified", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const payload = JSON.stringify([{ event: "delivered", sg_event_id: "evt-1" }]);
  const timestamp = "1784234000";
  const signature = sign("sha256", Buffer.from(`${timestamp}${payload}`), privateKey).toString("base64");
  const encodedPublicKey = publicKey.export({ format: "der", type: "spki" }).toString("base64");
  assert.equal(verifySendGridEventSignature({ payload, timestamp, signature, publicKey: encodedPublicKey }), true);
  assert.equal(verifySendGridEventSignature({ payload: `${payload} `, timestamp, signature, publicKey: encodedPublicKey }), false);
});

test("SendGrid event deduplication prefers the provider event id", () => {
  assert.equal(sendGridEventKey({ sg_event_id: "evt-123", event: "delivered" }), "evt-123");
  assert.equal(sendGridEventKey({ event: "delivered", email: "a@example.com" }), sendGridEventKey({ event: "delivered", email: "a@example.com" }));
});

test("newsletter system exposes confirmation, scheduling, archive, and subscriber management", async () => {
  const [schema, campaignService, formRoute, cronRoute, subscriberRoute] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/messages/service.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/forms/newsletter/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/cron/newsletter-campaigns/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/newsletters/subscribers/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(schema, /newsletterSubscriptions/);
  assert.match(schema, /newsletterIssues/);
  assert.match(campaignService, /List-Unsubscribe/);
  assert.match(campaignService, /processDueMessageCampaigns/);
  assert.match(campaignService, /skipLocked: true/);
  assert.match(campaignService, /status: "processing"/);
  assert.match(formRoute, /requestNewsletterSubscription/);
  assert.match(cronRoute, /isCronRequestAuthorized/);
  assert.match(subscriberRoute, /newsletter\.subscriber/);
});
