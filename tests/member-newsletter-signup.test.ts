import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  NEWSLETTER_TOPICS,
  PRIMARY_NEWSLETTER_TOPIC,
  resolveSubscriptionTopics,
} from "@/lib/newsletter/subscriptions";

async function readTextFile(relativePath: string) {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("weekly Shabbat list is the primary newsletter topic", () => {
  assert.equal(PRIMARY_NEWSLETTER_TOPIC, "weekly");
  assert.ok(NEWSLETTER_TOPICS.includes("weekly"));
});

test("members is a first-class newsletter list", () => {
  assert.ok(NEWSLETTER_TOPICS.includes("members"));
});

test("every subscription always includes the primary Shabbat list", () => {
  assert.deepEqual(resolveSubscriptionTopics(), ["weekly"]);
  assert.deepEqual(resolveSubscriptionTopics([]), ["weekly"]);
  // A member subscribes to both Members and the primary Shabbat list.
  assert.deepEqual(resolveSubscriptionTopics(["members"]), ["weekly", "members"]);
  // Requesting weekly explicitly does not duplicate it.
  assert.deepEqual(resolveSubscriptionTopics(["weekly"]), ["weekly"]);
  assert.deepEqual(resolveSubscriptionTopics(["members", "weekly"]), ["weekly", "members"]);
});

test("becoming a member subscribes to Members plus the Shabbat list", async () => {
  const routeSource = await readTextFile("app/api/membership-applications/route.ts");

  assert.match(routeSource, /subscribeEmailToNewsletterLists/);
  assert.match(routeSource, /topics:\s*\["members"\]/);
  assert.match(routeSource, /source:\s*"membership_application"/);
});

test("direct subscribe helper respects explicit opt-outs", async () => {
  const source = await readTextFile("lib/newsletter/subscriptions.ts");

  assert.match(source, /PROTECTED_SUBSCRIPTION_STATUSES/);
  assert.match(source, /unsubscribed/);
  assert.match(source, /status:\s*"subscribed"/);
});

test("the Mailchimp Members segment imports into the native members list", async () => {
  const source = await readTextFile("lib/mailchimp/export-import.ts");

  assert.match(source, /segmentKey:\s*"members",[\s\S]*?topic:\s*"members"/);
  assert.match(source, /MAILCHIMP_NEWSLETTER_TOPICS\s*=\s*\[[^\]]*"members"/);
});
