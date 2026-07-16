import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

async function readTextFile(relativePath: string) {
  return fs.readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("mobile drawer lets Radix connect DialogContent to its DialogTitle", async () => {
  const [drawerSource, navigationSource] = await Promise.all([
    readTextFile("components/navigation/mobile-drawer.tsx"),
    readTextFile("components/navigation/site-navigation.tsx"),
  ]);

  assert.match(drawerSource, /<SheetTitle>Browse Mekor<\/SheetTitle>/);
  assert.doesNotMatch(drawerSource, /aria-labelledby=\{titleId\}/);
  assert.doesNotMatch(drawerSource, /<SheetTitle id=\{titleId\}>/);
  assert.doesNotMatch(navigationSource, /titleId="native-mobile-drawer-title"/);
});
