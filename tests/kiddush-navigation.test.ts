import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { KIDDUSH_LINK, SITE_MENU, isNavGroup } from "../lib/navigation/site-menu";

async function readTextFile(relativePath: string) {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("kiddush sponsorship is a top-level main menu CTA", () => {
  const kiddushItem = SITE_MENU.find((item) => item.href === KIDDUSH_LINK.href);

  assert.ok(kiddushItem);
  assert.equal(kiddushItem?.label, "Sponsor a Kiddush");
  assert.equal(kiddushItem?.tone, "cta");
  assert.equal(isNavGroup(kiddushItem!), false);
});

test("more menu no longer hides kiddush as the only entry point", () => {
  const moreGroup = SITE_MENU.find((item) => item.label === "More");
  assert.ok(moreGroup && isNavGroup(moreGroup));
  if (!moreGroup || !isNavGroup(moreGroup)) {
    return;
  }

  assert.equal(
    moreGroup.children.some((child) => child.href === "/kiddush"),
    false,
  );
});

test("mobile drawer and compact nav surface sponsor a kiddush", async () => {
  const [drawerSource, navigationSource, pageSource] = await Promise.all([
    readTextFile("components/navigation/mobile-drawer.tsx"),
    readTextFile("components/navigation/site-navigation.tsx"),
    readTextFile("app/kiddush/page.tsx"),
  ]);

  assert.match(drawerSource, /KIDDUSH_LINK/);
  assert.match(drawerSource, /Celebrate a simcha with the community/);
  assert.match(navigationSource, /KIDDUSH_LINK/);
  assert.match(pageSource, /Choose a sponsorship/);
  assert.match(pageSource, /#kiddush-payment/);
});
