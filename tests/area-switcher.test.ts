import assert from "node:assert/strict";
import test from "node:test";

import { buildAreaSwitcherLinks } from "../lib/navigation/area-switcher";

test("admin area switcher includes all workspace links for admins", () => {
  const links = buildAreaSwitcherLinks({
    currentPath: "/admin",
    currentArea: "admin",
    role: "admin",
  });

  assert.deepEqual(
    links.map((link) => link.label),
    ["Public Site", "Member Area", "Admin"],
  );
});

test("member area switcher hides admin link even for admins", () => {
  const links = buildAreaSwitcherLinks({
    currentPath: "/account",
    currentArea: "member",
    role: "admin",
  });

  assert.deepEqual(
    links.map((link) => link.label),
    ["Public Site", "Member Area"],
  );
});

test("member sign-in context does not expose admin sign-in outside admin pages", () => {
  const links = buildAreaSwitcherLinks({
    currentPath: "/members",
    currentArea: "member",
    role: null,
    includeSignInLinks: true,
  });

  assert.deepEqual(
    links.map((link) => link.label),
    ["Public Site", "Member Sign In"],
  );
});
