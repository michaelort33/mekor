import assert from "node:assert/strict";
import test from "node:test";

import { getEdgeProtectionType } from "../lib/auth/edge-route-policy";
import { createNewsletterChatModel } from "../lib/newsletter/chat-model";
import {
  assertSafeNewsletterHtml,
  lintNewsletterHtml,
  sanitizeNewsletterHtml,
} from "../lib/newsletter/html-sanitize";

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
