import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getEdgeProtectionType } from "../lib/auth/edge-route-policy";

test("feedback chat and submit APIs are public; admin feedback is protected", () => {
  assert.equal(getEdgeProtectionType("/api/feedback/chat"), "none");
  assert.equal(getEdgeProtectionType("/api/feedback/submit"), "none");
  assert.equal(getEdgeProtectionType("/api/admin/feedback"), "admin");
  assert.equal(getEdgeProtectionType("/api/admin/feedback/12"), "admin");
  assert.equal(getEdgeProtectionType("/admin/feedback"), "admin");
});

test("public feedback chat route is rate-limited and tool-backed", async () => {
  const source = await readFile("app/api/feedback/chat/route.ts", "utf8");
  assert.match(source, /export const maxDuration = 60/);
  assert.match(source, /allowWithinWindow\(`feedback-chat:/);
  assert.match(source, /FEEDBACK_SYSTEM_PROMPT/);
  assert.match(source, /createFeedbackChatTools/);
  assert.match(source, /toUIMessageStreamResponse/);
  assert.match(source, /AI_UNAVAILABLE/);
  assert.match(source, /onEnd:/);
});

test("fallback submit route writes structured suggestions", async () => {
  const source = await readFile("app/api/feedback/submit/route.ts", "utf8");
  assert.match(source, /allowWithinWindow\(`feedback-submit:/);
  assert.match(source, /saveSuggestionFromTool/);
  assert.match(source, /createOrGetFeedbackSession/);
});

test("admin feedback APIs require actor and support status updates", async () => {
  const [listRoute, detailRoute] = await Promise.all([
    readFile("app/api/admin/feedback/route.ts", "utf8"),
    readFile("app/api/admin/feedback/[id]/route.ts", "utf8"),
  ]);
  assert.match(listRoute, /requireAdminActor/);
  assert.match(listRoute, /listSuggestionsForAdmin/);
  assert.match(detailRoute, /requireAdminActor/);
  assert.match(detailRoute, /updateSuggestionStatus/);
  assert.match(detailRoute, /site_feedback\.status_update/);
  assert.match(detailRoute, /SITE_SUGGESTION_STATUSES/);
});

test("public feedback APIs do not expose a suggestions list endpoint", async () => {
  const { access } = await import("node:fs/promises");
  const { readdir } = await import("node:fs/promises");

  await assert.rejects(() => access("app/api/feedback/route.ts"));
  const entries = await readdir("app/api/feedback");
  assert.deepEqual(entries.sort(), ["chat", "submit"]);

  const [chatRoute, submitRoute] = await Promise.all([
    readFile("app/api/feedback/chat/route.ts", "utf8"),
    readFile("app/api/feedback/submit/route.ts", "utf8"),
  ]);
  assert.doesNotMatch(chatRoute, /export async function GET/);
  assert.doesNotMatch(submitRoute, /export async function GET/);
  assert.doesNotMatch(chatRoute, /listSuggestionsForAdmin/);
  assert.doesNotMatch(submitRoute, /listSuggestionsForAdmin/);
  assert.match(chatRoute, /allowWithinWindow\(`feedback-chat:/);
  assert.match(submitRoute, /allowWithinWindow\(`feedback-submit:/);
});
