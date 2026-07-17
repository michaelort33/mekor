import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { sendGridEventKey, verifySendGridEventSignature } from "@/lib/newsletter/sendgrid-events";
import {
  buildNewsletterConfirmationEmail,
  buildUnsubscribeUrl,
  normalizeNewsletterEmail,
} from "@/lib/newsletter/subscriptions";

test("newsletter addresses and unsubscribe links are normalized", () => {
  assert.equal(normalizeNewsletterEmail("  Person@Example.COM "), "person@example.com");
  assert.equal(
    buildUnsubscribeUrl("https://www.mekorhabracha.org", "token with spaces"),
    "https://www.mekorhabracha.org/api/newsletter/unsubscribe?token=token%20with%20spaces",
  );
});

test("newsletter confirmation email warmly reflects approved Mekor language", () => {
  const confirmUrl = "https://www.mekorhabracha.org/api/newsletter/confirm?token=test-token";
  const email = buildNewsletterConfirmationEmail(confirmUrl);

  assert.equal(email.subject, "Welcome to Mekor Habracha — confirm your subscription");
  assert.match(email.text, /vibrant, inclusive Modern Orthodox community/);
  assert.match(email.text, /across the street or across the world/);
  assert.match(email.html, /A welcoming community/);
  assert.match(email.html, /Confirm my subscription/);
  assert.match(email.html, new RegExp(confirmUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(email.html, /expires in 48 hours/);
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

test("newsletter system exposes confirmation, scheduling, archive, subscriber management, and Mailchimp CRM history", async () => {
  const [schema, campaignService, subscriptions, formRoute, cronRoute, subscriberRoute, personRoute] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/messages/service.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/newsletter/subscriptions.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/forms/newsletter/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/cron/newsletter-campaigns/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/newsletters/subscribers/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/people/[id]/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(schema, /newsletterSubscriptions/);
  assert.match(schema, /newsletterIssues/);
  assert.match(campaignService, /List-Unsubscribe/);
  assert.match(campaignService, /processDueMessageCampaigns/);
  assert.match(campaignService, /eq\(newsletterSubscriptions\.topic, "weekly"\)/);
  assert.match(campaignService, /skipLocked: true/);
  assert.match(campaignService, /status: "processing"/);
  assert.match(formRoute, /requestNewsletterSubscription/);
  assert.match(cronRoute, /isCronRequestAuthorized/);
  assert.match(subscriberRoute, /newsletter\.subscriber/);
  assert.match(subscriptions, /syncNewsletterEmailPreference/);
  assert.match(schema, /mailchimpImportRuns/);
  assert.match(schema, /mailchimpContacts/);
  assert.match(schema, /mailchimpSegmentMemberships/);
  assert.match(personRoute, /mailchimpProfiles/);
});
