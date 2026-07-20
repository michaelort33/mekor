import assert from "node:assert/strict";
import test from "node:test";

import { SITE_MENU, isNavGroup } from "../lib/navigation/site-menu";

test("community menu includes Ask Mekor", () => {
  const communityGroup = SITE_MENU.find((item) => item.label === "Community");
  assert.ok(communityGroup);
  assert.equal(isNavGroup(communityGroup), true);
  if (!communityGroup || !isNavGroup(communityGroup)) {
    throw new Error("Community menu group missing");
  }
  assert.equal(communityGroup.children.some((child) => child.href === "/ask-mekor" && child.label === "Ask Mekor"), true);
});
