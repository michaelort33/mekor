import assert from "node:assert/strict";
import test from "node:test";

import { getEdgeProtectionType } from "../lib/auth/edge-route-policy";
import {
  assertSafeNewsletterHtml,
  lintNewsletterHtml,
  sanitizeNewsletterHtml,
} from "../lib/newsletter/html-sanitize";
import { validateNewsletterHtmlInSandbox } from "../lib/newsletter/sandbox-validate";
import { createNewsletterChatModel } from "../lib/newsletter/chat-model";
import {
  buildVersionPathname,
  isTemplateVersionPath,
  templateVersionsPrefix,
} from "../lib/newsletter/template-blob";

test("admin newsletter studio and blob APIs are admin-protected", () => {
  assert.equal(getEdgeProtectionType("/admin/templates/12/studio"), "admin");
  assert.equal(getEdgeProtectionType("/api/admin/templates/chat"), "admin");
  assert.equal(getEdgeProtectionType("/api/admin/templates/12/blob"), "admin");
  assert.equal(getEdgeProtectionType("/api/admin/templates/12/blob/activate"), "admin");
  assert.equal(getEdgeProtectionType("/api/admin/templates/12/blob/content"), "admin");
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

test("blob path helpers scope versions per template", () => {
  assert.equal(templateVersionsPrefix(42), "mekor/newsletters/templates/42/versions/");
  const pathname = buildVersionPathname(42, "AI Draft!!");
  assert.equal(isTemplateVersionPath(42, pathname), true);
  assert.equal(isTemplateVersionPath(43, pathname), false);
  assert.equal(isTemplateVersionPath(42, "mekor/newsletters/templates/42/versions/../secret.html"), false);
  assert.equal(pathname.endsWith(".html"), true);
  assert.match(pathname, /ai-draft/);
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

test("sandbox validate falls back locally without OIDC", async () => {
  const previousOidc = process.env.VERCEL_OIDC_TOKEN;
  const previousToken = process.env.VERCEL_TOKEN;
  delete process.env.VERCEL_OIDC_TOKEN;
  delete process.env.VERCEL_TOKEN;

  try {
    const result = await validateNewsletterHtmlInSandbox(
      `<table style="width:100%"><tr><td>Ok</td></tr></table><script>nope()</script>`,
    );
    assert.equal(result.mode, "local-fallback");
    assert.equal(result.ok, true);
    assert.equal(/<script/i.test(result.sanitizedHtml), false);
  } finally {
    if (previousOidc === undefined) delete process.env.VERCEL_OIDC_TOKEN;
    else process.env.VERCEL_OIDC_TOKEN = previousOidc;
    if (previousToken === undefined) delete process.env.VERCEL_TOKEN;
    else process.env.VERCEL_TOKEN = previousToken;
  }
});
