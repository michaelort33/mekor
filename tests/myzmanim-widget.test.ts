import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

async function readSource(relativePath: string) {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("the Davening page ships the issued Philadelphia MyZmanim widget", async () => {
  const [pageSource, configSource] = await Promise.all([
    readSource("app/davening/page.tsx"),
    readSource("app/davening/myzmanim-config.ts"),
  ]);

  assert.match(pageSource, /DEFAULT_MYZMANIM_WIDGET_EMBED_HTML/);
  assert.match(pageSource, /today&apos;s Philadelphia times directly/);
  assert.doesNotMatch(pageSource, /To activate the live embed|MYZMANIM requires an account/i);

  assert.match(configSource, /https:\/\/www\.mekorhabracha\.org\/davening/);
  assert.match(configSource, /https:\/\/www\.myzmanim\.com\/widget\.aspx/);
  assert.match(configSource, /mode=Standard/);
  assert.match(configSource, /fsize=13/);
  assert.match(configSource, /fcolor=233D58/);
  assert.match(configSource, /hcolor=FFF9EF/);
  assert.match(configSource, /bcolor=DDD3C2/);
});

test("the parser-style MyZmanim script runs inside a constrained frame", async () => {
  const widgetSource = await readSource("app/davening/myzmanim-widget.tsx");

  assert.match(widgetSource, /srcDoc=\{srcDoc\}/);
  assert.match(widgetSource, /sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-scripts"/);
  assert.doesNotMatch(widgetSource, /allow-same-origin/);
  assert.doesNotMatch(widgetSource, /container\.innerHTML/);
});
