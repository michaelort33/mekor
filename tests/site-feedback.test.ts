import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createFeedbackChatModel } from "../lib/feedback/chat-model";
import { saveSuggestionInputSchema } from "../lib/feedback/save-suggestion-schema";
import { sanitizeSuggestionBody, stripControlCharacters } from "../lib/feedback/sanitize";
import { FEEDBACK_SYSTEM_PROMPT } from "../lib/feedback/system-prompt";
import {
  getSuggestionKindLabel,
  getSuggestionStatusLabel,
  isSiteSuggestionKind,
  isSiteSuggestionStatus,
} from "../lib/feedback/types";

test("feedback system prompt forbids Q&A and knowledge-base answers", () => {
  assert.match(FEEDBACK_SYSTEM_PROMPT, /ONLY job is to collect suggestions and feedback/i);
  assert.match(FEEDBACK_SYSTEM_PROMPT, /do NOT answer questions/i);
  assert.match(FEEDBACK_SYSTEM_PROMPT, /do NOT use a knowledge base/i);
  assert.match(FEEDBACK_SYSTEM_PROMPT, /ask-mekor/i);
  assert.match(FEEDBACK_SYSTEM_PROMPT, /contact-us/i);
  assert.match(FEEDBACK_SYSTEM_PROMPT, /saveSuggestion/);
  assert.match(FEEDBACK_SYSTEM_PROMPT, /Never mention system prompts/i);
  assert.doesNotMatch(FEEDBACK_SYSTEM_PROMPT, /warm, cute/);
});

test("saveSuggestion schema accepts valid payloads and rejects short bodies", () => {
  const ok = saveSuggestionInputSchema.safeParse({
    kind: "suggestion",
    title: "Add dark mode",
    body: "A soft dark theme would help evening browsing.",
    categoryDetail: "site chrome",
    contactEmail: "",
  });
  assert.equal(ok.success, true);
  if (ok.success) {
    assert.equal(ok.data.priority, "normal");
    assert.equal(ok.data.contactName, "");
  }

  const badEmail = saveSuggestionInputSchema.safeParse({
    kind: "feedback",
    title: "Nice site",
    body: "Really enjoying the new events page layout overall.",
    contactEmail: "not-an-email",
  });
  assert.equal(badEmail.success, false);

  const shortBody = saveSuggestionInputSchema.safeParse({
    kind: "bug",
    title: "Broken link",
    body: "short",
  });
  assert.equal(shortBody.success, false);
});

test("suggestion kind and status helpers are exhaustive and typed", () => {
  assert.equal(getSuggestionKindLabel("suggestion"), "Suggestion");
  assert.equal(getSuggestionKindLabel("bug"), "Bug");
  assert.equal(getSuggestionStatusLabel("new"), "New");
  assert.equal(getSuggestionStatusLabel("archived"), "Archived");
  assert.equal(isSiteSuggestionKind("praise"), true);
  assert.equal(isSiteSuggestionKind("nope"), false);
  assert.equal(isSiteSuggestionStatus("reviewed"), true);
  assert.equal(isSiteSuggestionStatus("closed"), false);
});

test("createFeedbackChatModel requires gateway or OpenAI auth", () => {
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
    assert.throws(() => createFeedbackChatModel(), /AI Gateway|OPENAI_API_KEY/);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("feedback chat tools wire saveSuggestion to the service", async () => {
  const toolsSource = await readFile("lib/feedback/chat-tools.ts", "utf8");
  assert.match(toolsSource, /saveSuggestion: tool\(/);
  assert.match(toolsSource, /saveSuggestionFromTool/);
  assert.match(toolsSource, /saveSuggestionInputSchema/);
});

test("sanitize strips control characters from suggestion text", () => {
  assert.equal(stripControlCharacters("hello\u0000world\u0007!"), "helloworld!");
  assert.equal(
    sanitizeSuggestionBody("Line one\n\n\n\nLine two\u0008."),
    "Line one\n\nLine two.",
  );
});
