import assert from "node:assert/strict";
import test from "node:test";

import { getEdgeProtectionType } from "../lib/auth/edge-route-policy";
import { createNewsletterChatModel } from "../lib/newsletter/chat-model";
import {
  assertSafeNewsletterHtml,
  lintNewsletterHtml,
  sanitizeNewsletterHtml,
} from "../lib/newsletter/html-sanitize";
import { getNewsletterRecipientList } from "../lib/newsletter/recipient-lists";

test("admin newsletter studio and chat API are admin-protected", () => {
  assert.equal(getEdgeProtectionType("/admin/templates/12/studio"), "admin");
  assert.equal(getEdgeProtectionType("/api/admin/templates/chat"), "admin");
});

test("sanitizeNewsletterHtml strips scripts and handlers", () => {
  const dirty = `<div onclick="alert(1)"><script>alert(2)</script><a href="javascript:void(0)">x</a></div>`;
  const clean = sanitizeNewsletterHtml(dirty);
  assert.equal(/<script/i.test(clean), false);
  assert.equal(/onclick/i.test(clean), false);
  assert.equal(/javascript:/i.test(clean), false);
  assert.match(clean, /<a href="#">x<\/a>/i);
});

test("lintNewsletterHtml flags empty and unsafe HTML", () => {
  const empty = lintNewsletterHtml("   ");
  assert.equal(empty.some((issue) => issue.code === "empty"), true);

  const unsafe = lintNewsletterHtml(`<p onmouseover="x()">Hi</p><script>bad()</script>`);
  assert.equal(unsafe.some((issue) => issue.level === "error" && issue.code === "script_tag"), true);
  assert.equal(unsafe.some((issue) => issue.level === "error" && issue.code === "inline_handler"), true);
});

test("assertSafeNewsletterHtml accepts table email HTML", () => {
  const html = assertSafeNewsletterHtml(
    `<table style="width:100%"><tr><td style="color:#123">Shabbat Shalom</td></tr></table>`,
  );
  assert.match(html, /Shabbat Shalom/);
});

test("createNewsletterChatModel requires gateway or OpenAI auth", () => {
  const previous = {
    AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
    VERCEL_OIDC_TOKEN: process.env.VERCEL_OIDC_TOKEN,
    VERCEL_ENV: process.env.VERCEL_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  };
  delete process.env.AI_GATEWAY_API_KEY;
  delete process.env.VERCEL_OIDC_TOKEN;
  delete process.env.VERCEL_ENV;
  delete process.env.OPENAI_API_KEY;

  try {
    assert.throws(() => createNewsletterChatModel(), /AI Gateway|OPENAI_API_KEY/);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("studio architecture does not depend on Sandbox or Blob version APIs", async () => {
  const { access } = await import("node:fs/promises");
  await assert.rejects(() => access("lib/newsletter/template-blob.ts"));
  await assert.rejects(() => access("lib/newsletter/sandbox-validate.ts"));
  await assert.rejects(() => access("app/api/admin/templates/[id]/blob/route.ts"));
  await assert.rejects(() => access("drizzle/0029_newsletter_template_blob.sql"));
});

test("studio preview and persistence keep editable HTML isolated", async () => {
  const { readFile } = await import("node:fs/promises");
  const [studio, templateRoute] = await Promise.all([
    readFile("app/admin/templates/[id]/studio/studio-client.tsx", "utf8"),
    readFile("app/api/admin/templates/route.ts", "utf8"),
  ]);

  assert.match(studio, /sanitizeNewsletterHtml\(html\)/);
  assert.match(studio, /sandbox="" srcDoc=\{previewHtml\}/);
  assert.match(studio, /<details className=\{styles\.htmlDetails\}>/);
  assert.match(studio, /<div className=\{styles\.workflow\}>/);
  assert.match(studio, /<aside className=\{styles\.chatPanel\} aria-label="Newsletter AI editor">/);
  assert.match(studio, /<MessageScrollerProvider autoScroll>/);
  assert.match(studio, /<MessageScrollerItem key=\{message\.id\} scrollAnchor=\{isUser\}>/);
  assert.match(studio, /variant=\{isUser \? "default" : "secondary"\}/);
  assert.doesNotMatch(studio, /chatDrawer/);
  assert.match(studio, /method: "PATCH"/);
  assert.match(studio, /saveQueueRef\.current\.then/);
  assert.match(studio, /const saved = await persistHtml\(html, subject\);\s+if \(!saved\) return;/);
  assert.match(studio, /saveTimerRef\.current = setTimeout\(\(\) => \{\s+void persistHtml\(nextHtml\);/);
  assert.match(templateRoute, /export async function PATCH/);
  assert.match(templateRoute, /bodyHtml: sanitizeNewsletterHtml\(body\.bodyHtml\)/);
});

test("newsletter AI turns are saved and restored as template history", async () => {
  const { readFile } = await import("node:fs/promises");
  const [studioPage, chatRoute] = await Promise.all([
    readFile("app/admin/templates/[id]/studio/page.tsx", "utf8"),
    readFile("app/api/admin/templates/chat/route.ts", "utf8"),
  ]);

  assert.match(chatRoute, /action: "newsletter\.template\.chat\.turn"/);
  assert.match(chatRoute, /prompt,/);
  assert.match(chatRoute, /response: text\.trim\(\) \|\| "Newsletter updated\."/);
  assert.match(chatRoute, /htmlChanged:/);
  assert.match(chatRoute, /subjectChanged:/);
  assert.match(studioPage, /eq\(adminAuditLog\.action, "newsletter\.template\.chat\.turn"\)/);
  assert.match(studioPage, /initialMessages=\{initialMessages\}/);
});

test("selected newsletter recipients are revalidated before campaign creation", async () => {
  const { readFile } = await import("node:fs/promises");
  const sendRoute = await readFile("app/api/admin/templates/send/route.ts", "utf8");

  assert.match(sendRoute, /eq\(newsletterSubscriptions\.topic, "weekly"\)/);
  assert.match(sendRoute, /eq\(newsletterSubscriptions\.status, "subscribed"\)/);
  assert.match(sendRoute, /Every selected recipient must be a confirmed weekly subscriber/);
  assert.match(sendRoute, /sanitizeNewsletterHtml/);
  assert.match(sendRoute, /recipientGroup === "admins_only" \? undefined : "newsletter_subscribers"/);
});

test("Michael test list is server-resolved to one confirmed subscriber", async () => {
  const { readFile } = await import("node:fs/promises");
  const [studio, sendRoute] = await Promise.all([
    readFile("app/admin/templates/[id]/studio/studio-client.tsx", "utf8"),
    readFile("app/api/admin/templates/send/route.ts", "utf8"),
  ]);
  const list = getNewsletterRecipientList("michael_test");

  assert.equal(list.name, "Michael test list");
  assert.deepEqual(list.emails, ["michaelort@hyatus.com"]);
  assert.match(studio, /recipientGroup: recipientListKey \? "recipient_list" : "selected"/);
  assert.match(sendRoute, /getNewsletterRecipientList/);
  assert.match(sendRoute, /Test recipient is not a confirmed weekly subscriber/);
});
