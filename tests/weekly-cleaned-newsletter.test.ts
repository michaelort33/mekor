import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildWeeklyCleanedTemplateDraft,
  generateWeeklyCleanedHtml,
  WEEKLY_CLEANED_BULLETIN_URL,
  WEEKLY_CLEANED_LOGO_URL,
  WEEKLY_CLEANED_SHABBAT_BANNER_URL,
  WEEKLY_CLEANED_TEMPLATE_TITLE,
} from "../lib/newsletter/weekly-cleaned";

test("weekly cleaned starter keeps lean weekly sections and links the bulletin board", () => {
  const html = generateWeeklyCleanedHtml({
    parshaName: "Parshat Matot-Masei",
    shabbatDate: "July 10 - 11, 2026",
    hebrewDate: "26 Tammuz 5786",
    candleLighting: "8:12pm",
  });

  assert.match(html, /Parshat Matot-Masei/);
  assert.match(html, /Shabbat Schedule/);
  assert.match(html, /Kiddush \/ Sponsors This Week/);
  assert.match(html, /This Week at Mekor/);
  assert.match(html, /Weekday Services/);
  assert.match(html, /Community Bulletin Board/);
  assert.match(html, new RegExp(WEEKLY_CLEANED_BULLETIN_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(html, /Open the Bulletin Board/);
  assert.match(html, /Living Flyer Board/);
  assert.match(html, new RegExp(`src="${WEEKLY_CLEANED_LOGO_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  assert.match(
    html,
    new RegExp(`src="${WEEKLY_CLEANED_SHABBAT_BANNER_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`),
  );
  assert.match(html, /<img /);

  assert.doesNotMatch(html, /Hebrew Help at Mekor/);
  assert.doesNotMatch(html, /For Kosher Wine use this link/);
  assert.doesNotMatch(html, /Join Mekor or Renew Your Membership HERE/);
});

test("weekly cleaned draft uses the shared template title", () => {
  const draft = buildWeeklyCleanedTemplateDraft();
  assert.equal(draft.title, WEEKLY_CLEANED_TEMPLATE_TITLE);
  assert.equal(draft.category, "weekly");
  assert.equal(draft.status, "draft");
  assert.match(draft.bodyHtml, /Open the Bulletin Board/);
  assert.match(draft.bodyHtml, /<img /);
});

test("new newsletter builder offers the weekly cleaned starter by default", async () => {
  const page = await readFile("app/admin/templates/new/page.tsx", "utf8");
  assert.match(page, /WEEKLY_CLEANED_TEMPLATE_TITLE/);
  assert.match(page, /starterKind === "weekly-cleaned"/);
  assert.match(page, /useState<StarterKind>\("weekly-cleaned"\)/);
  assert.match(page, /buildWeeklyCleanedTemplateDraft/);
});

test("homepage links to the bulletin board instead of repeating campaign blocks", async () => {
  const page = await readFile("app/page.tsx", "utf8");
  assert.match(page, /href="\/mekor-bulletin-board"/);
  assert.match(page, /View the Bulletin Board/);
  assert.doesNotMatch(page, /Strengthen the Center City Eruv/);
  assert.doesNotMatch(page, /New Class on Zionism and Democracy/);
});

test("bulletin board hosts standing weekly evergreen content", async () => {
  const [page, content] = await Promise.all([
    readFile("app/mekor-bulletin-board/page.tsx", "utf8"),
    readFile("app/mekor-bulletin-board/content.ts", "utf8"),
  ]);
  assert.match(page, /Standing Community Info/);
  assert.match(page, /Featured Now/);
  assert.match(page, /Living Flyer Board|Living flyer board/);
  assert.match(content, /Tot Shabbat/);
  assert.match(content, /Hebrew Help at Mekor/);
  assert.match(content, /Kosher Wine & Judaica/);
  assert.match(content, /zionismFlyer/);
});
