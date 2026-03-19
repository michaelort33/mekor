import assert from "node:assert/strict";
import test from "node:test";

import { SITE_MENU, isNavGroup } from "../lib/navigation/site-menu";

test("more menu includes Ask Mekor", () => {
  const moreGroup = SITE_MENU.find((item) => item.label === "More");
  assert.ok(moreGroup);
  assert.equal(isNavGroup(moreGroup), true);
  if (!moreGroup || !isNavGroup(moreGroup)) {
    throw new Error("More menu group missing");
  }
  assert.equal(moreGroup.children.some((child) => child.href === "/ask-mekor" && child.label === "Ask Mekor"), true);
});
