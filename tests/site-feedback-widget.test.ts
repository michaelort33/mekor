import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { shouldHideFeedbackWidget } from "../lib/feedback/widget-visibility";

test("feedback widget hides on admin and auth routes", () => {
  assert.equal(shouldHideFeedbackWidget("/"), false);
  assert.equal(shouldHideFeedbackWidget("/events"), false);
  assert.equal(shouldHideFeedbackWidget("/account"), false);
  assert.equal(shouldHideFeedbackWidget("/admin"), true);
  assert.equal(shouldHideFeedbackWidget("/admin/feedback"), true);
  assert.equal(shouldHideFeedbackWidget("/login"), true);
  assert.equal(shouldHideFeedbackWidget("/signup"), true);
  assert.equal(shouldHideFeedbackWidget("/forgot-password"), true);
  assert.equal(shouldHideFeedbackWidget("/reset-password"), true);
  assert.equal(shouldHideFeedbackWidget("/invite/accept"), true);
});

test("site feedback widget uses sheet chat chrome and validates public chat input", async () => {
  const [widget, panel, layout, chatRoute] = await Promise.all([
    readFile("components/feedback/site-feedback-widget.tsx", "utf8"),
    readFile("components/feedback/feedback-chat-panel.tsx", "utf8"),
    readFile("app/layout.tsx", "utf8"),
    readFile("app/api/feedback/chat/route.ts", "utf8"),
  ]);

  assert.match(widget, /Share an idea/);
  assert.match(widget, /<SheetTitle>Share an idea<\/SheetTitle>/);
  assert.match(widget, /This chat is for feedback only/);
  assert.match(widget, /won’t answer questions/);
  assert.doesNotMatch(widget, /with warmth|with a smile/i);
  assert.match(widget, /max-sm:inset-0/);
  assert.match(widget, /FeedbackChatPanel/);
  assert.match(panel, /Have an idea for Mekor\?/);
  assert.match(panel, /Share a suggestion, bug report, or kind note/);
  assert.doesNotMatch(panel, /with warmth|with a smile|Hi friend/i);
  assert.match(panel, /DefaultChatTransport/);
  assert.match(panel, /\/api\/feedback\/chat/);
  assert.match(panel, /MessageScrollerProvider/);
  assert.match(panel, /FeedbackFallbackForm/);
  assert.match(panel, /mekor\.feedback\.sessionPublicId/);
  assert.match(layout, /<SiteFeedbackWidget \/>/);
  assert.match(chatRoute, /rawMessages\.every\(isFeedbackMessage\)/);
  assert.match(chatRoute, /latest message must be from the visitor/i);
  assert.match(chatRoute, /requestedSessionPublicId/);
});

test("admin shell links to feedback console", async () => {
  const [shell, page] = await Promise.all([
    readFile("components/admin/admin-shell.tsx", "utf8"),
    readFile("app/admin/feedback/page.tsx", "utf8"),
  ]);
  assert.match(shell, /href: "\/admin\/feedback"/);
  assert.match(shell, /label: "Feedback"/);
  assert.match(page, /FeedbackAdminConsole/);
  assert.match(page, /Suggestions & Feedback/);
});
