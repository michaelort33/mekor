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

test("site feedback widget uses sheet chat chrome and cute copy", async () => {
  const [widget, panel, layout] = await Promise.all([
    readFile("components/feedback/site-feedback-widget.tsx", "utf8"),
    readFile("components/feedback/feedback-chat-panel.tsx", "utf8"),
    readFile("app/layout.tsx", "utf8"),
  ]);

  assert.match(widget, /Share an idea/);
  assert.match(widget, /<SheetTitle>Share an idea<\/SheetTitle>/);
  assert.match(widget, /doesn’t answer questions/);
  assert.match(widget, /max-sm:inset-0/);
  assert.match(widget, /FeedbackChatPanel/);
  assert.match(panel, /DefaultChatTransport/);
  assert.match(panel, /\/api\/feedback\/chat/);
  assert.match(panel, /MessageScrollerProvider/);
  assert.match(panel, /FeedbackFallbackForm/);
  assert.match(panel, /mekor\.feedback\.sessionPublicId/);
  assert.match(layout, /<SiteFeedbackWidget \/>/);
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
