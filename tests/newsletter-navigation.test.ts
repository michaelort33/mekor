import assert from "node:assert/strict";
import test from "node:test";

import { SITE_MENU, isNavGroup } from "../lib/navigation/site-menu";

test("more menu includes Past Newsletters", () => {
  const moreGroup = SITE_MENU.find((item) => item.label === "More");

  assert.ok(moreGroup);
  assert.equal(isNavGroup(moreGroup), true);
  if (!isNavGroup(moreGroup)) return;

  assert.equal(
    moreGroup.children.some((child) => child.href === "/newsletters" && child.label === "Past Newsletters"),
    true,
  );
});
