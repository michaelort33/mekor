import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { GIVE_MENU, KIDDUSH_LINK, SITE_MENU, isNavGroup } from "../lib/navigation/site-menu";

async function readTextFile(relativePath: string) {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("kiddush sponsorship is a first-class give menu entry", () => {
  const kiddushItem = GIVE_MENU.find((link) => link.href === KIDDUSH_LINK.href);

  assert.ok(kiddushItem);
  assert.equal(kiddushItem?.label, "Sponsor a Kiddush");
  assert.equal(kiddushItem?.note, "For a simcha or yahrtzeit");
});

test("kiddush is not buried inside any public nav group", () => {
  for (const item of SITE_MENU) {
    assert.notEqual(item.href, KIDDUSH_LINK.href);
    if (isNavGroup(item)) {
      assert.equal(
        item.children.some((child) => child.href === KIDDUSH_LINK.href),
        false,
      );
    }
  }
});

test("desktop give menu and mobile drawer surface sponsor a kiddush", async () => {
  const [navCtaSource, drawerSource, pageSource] = await Promise.all([
    readTextFile("components/navigation/nav-cta.tsx"),
    readTextFile("components/navigation/mobile-drawer.tsx"),
    readTextFile("app/kiddush/page.tsx"),
  ]);

  assert.match(navCtaSource, /GIVE_MENU/);
  assert.match(drawerSource, /Sponsor a Kiddush — for a simcha or yahrtzeit/);
  assert.match(pageSource, /Choose a sponsorship/);
  assert.match(pageSource, /#kiddush-payment/);
});

test("kiddush sponsorship gives yahrtzeits equal billing with simchas", async () => {
  const [pageSource, checkoutSource] = await Promise.all([
    readTextFile("app/kiddush/page.tsx"),
    readTextFile("components/payments/kiddush-payment-section.tsx"),
  ]);

  assert.match(pageSource, /subtitle="For a simcha or yahrtzeit"/);
  assert.match(pageSource, /commemorate a yahrtzeit by sponsoring a Shabbat Kiddush/);
  assert.match(pageSource, /honoring the memory of someone impactful in your life/);
  assert.match(checkoutSource, /placeholder="In honor or memory of…"/);
  assert.doesNotMatch(pageSource, /Celebrate a simcha with the Mekor community/);
});
