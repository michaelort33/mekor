import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("new newsletter flow chooses a base, iterates with AI, previews safely, and only saves at the end", async () => {
  const [page, aiRoute, templateRoute] = await Promise.all([
    readFile("app/admin/templates/new/page.tsx", "utf8"),
    readFile("app/api/admin/templates/ai/route.ts", "utf8"),
    readFile("app/api/admin/templates/route.ts", "utf8"),
  ]);

  assert.match(page, /WEEKLY_CLEANED_TEMPLATE_TITLE/);
  assert.match(page, /buildWeeklyCleanedTemplateDraft/);
  assert.match(page, /Blank canvas/);
  assert.match(page, /use an existing newsletter/);
  assert.match(page, /\/api\/admin\/templates\?summary=true/);
  assert.match(page, /\/api\/admin\/templates\?id=\$\{selected\.id\}/);
  assert.match(page, /history: messages\.slice\(-10\)/);
  assert.match(page, /sandbox="" srcDoc=\{previewHtml\}/);
  assert.match(page, /method: "POST"/);
  assert.match(page, /credentials: "same-origin"/);
  assert.match(page, /response\.status === 401/);
  assert.match(page, /Your admin session expired/);
  assert.match(page, /Save & continue to send/);
  assert.match(page, /NewsletterFlowSteps/);
  assert.match(page, /router\.push\(`\/admin\/templates\/\$\{payload\.template\.id\}\/studio\?from=new`\)/);
  assert.doesNotMatch(page, /Generate HTML design/);
  assert.doesNotMatch(page, /Primary section title/);
  assert.doesNotMatch(page, /\/api\/admin\/templates\/send/);

  assert.match(aiRoute, /history: z/);
  assert.match(aiRoute, /createNewsletterChatModel/);
  assert.match(aiRoute, /generateObject/);
  assert.match(aiRoute, /smallest targeted edit/);
  assert.match(aiRoute, /sanitizeNewsletterHtml\(object\.bodyHtml\)/);
  assert.match(templateRoute, /searchParams\.get\("summary"\) === "true"/);
  const summaryBlock = templateRoute.slice(
    templateRoute.indexOf('if (searchParams.get("summary") === "true")'),
    templateRoute.indexOf("  const rows = await db\n    .select()"),
  );
  assert.doesNotMatch(summaryBlock, /bodyHtml/);
});
