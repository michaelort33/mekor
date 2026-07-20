import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

async function readTextFile(relativePath: string) {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("bulletin board shell copy speaks to members, not about content strategy", async () => {
  const [pageSource, contentSource, homepageSource, newsletterSource] = await Promise.all([
    readTextFile("app/mekor-bulletin-board/page.tsx"),
    readTextFile("app/mekor-bulletin-board/content.ts"),
    readTextFile("app/page.tsx"),
    readTextFile("lib/newsletter/weekly-cleaned.ts"),
  ]);

  for (const source of [pageSource, homepageSource, newsletterSource]) {
    assert.doesNotMatch(source, /Living Flyer Board/i);
    assert.doesNotMatch(source, /stays? focused/);
  }
  assert.doesNotMatch(pageSource, /One board for repeating/);
  assert.doesNotMatch(pageSource, /used to repeat/);
  assert.match(pageSource, /Community Essentials/);
  assert.match(pageSource, /kept up to\s+date/);
  assert.match(contentSource, /label: "Essentials"/);
  assert.match(homepageSource, /every standing\s+notice, one click away/);
  assert.match(newsletterSource, /always on the <strong>Mekor Bulletin Board<\/strong>/);
});
