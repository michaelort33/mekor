import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { SUPPORT_MEKOR_LINK } from "../lib/navigation/site-menu";

async function readTextFile(relativePath: string) {
  return fs.readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("donation destination remains the canonical donations page", () => {
  assert.equal(SUPPORT_MEKOR_LINK.href, "/donations");
});

test("donation calls to action are visible in compact navigation and at the top of the mobile menu", async () => {
  const [navigationSource, drawerSource] = await Promise.all([
    readTextFile("components/navigation/site-navigation.tsx"),
    readTextFile("components/navigation/mobile-drawer.tsx"),
  ]);

  assert.match(navigationSource, /Donate or sponsor Mekor/);
  assert.match(navigationSource, /min-\[1441px\]:hidden/);
  assert.match(navigationSource, /<Heart className="h-3\.5 w-3\.5"/);
  assert.doesNotMatch(navigationSource, /HeartHandshake/);
  assert.match(drawerSource, /Donate or sponsor/);
  assert.match(drawerSource, /<Heart className="h-4 w-4 flex-none"/);
  assert.doesNotMatch(drawerSource, /HeartHandshake/);
  assert.match(drawerSource, /showDonate=\{false\}/);
});

test("homepage invites visitors to donate and sponsor a Kiddush", async () => {
  const homepageSource = await readTextFile("app/page.tsx");

  assert.match(homepageSource, /Support Jewish life in Center City/);
  assert.match(homepageSource, /href="\/donations"/);
  assert.match(homepageSource, /Donate or sponsor/);
  assert.match(homepageSource, /href="\/kiddush"/);
  assert.match(homepageSource, /Sponsor a Kiddush/);
});
