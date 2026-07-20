import assert from "node:assert/strict";
import test from "node:test";

import { SITE_MENU, isNavGroup } from "../lib/navigation/site-menu";

test("community menu includes Past Newsletters", () => {
  const communityGroup = SITE_MENU.find((item) => item.label === "Community");

  assert.ok(communityGroup);
  assert.equal(isNavGroup(communityGroup), true);
  if (!isNavGroup(communityGroup)) return;

  assert.equal(
    communityGroup.children.some((child) => child.href === "/newsletters" && child.label === "Past Newsletters"),
    true,
  );
});
