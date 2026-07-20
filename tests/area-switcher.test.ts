import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { buildAreaSwitcherLinks } from "../lib/navigation/area-switcher";

async function readTextFile(relativePath: string) {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("active area switcher link keeps light text on the dark blue pill", async () => {
  const css = await readTextFile("components/navigation/area-switcher.module.css");

  assert.match(css, /\.linkCurrent,\s*\n\.linkCurrent:visited\s*\{[\s\S]*?color:\s*#f7fbff\s*!important/);
  assert.match(css, /\.linkCurrent:hover,\s*\n\.linkCurrent:focus-visible\s*\{[\s\S]*?color:\s*#f7fbff\s*!important/);
  assert.match(css, /\.link\s*\{[\s\S]*?color:\s*#274d6f\s*!important/);
});

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

test("member area switcher shows admin link for admins", () => {
  const links = buildAreaSwitcherLinks({
    currentPath: "/members",
    currentArea: "member",
    role: "admin",
  });

  assert.deepEqual(
    links.map((link) => link.label),
    ["Public Site", "Member Area", "Admin"],
  );
  assert.equal(links.find((link) => link.area === "admin")?.href, "/admin");
});

test("public site switcher shows admin link for super admins", () => {
  const links = buildAreaSwitcherLinks({
    currentPath: "/",
    currentArea: "site",
    role: "super_admin",
  });

  assert.deepEqual(
    links.map((link) => link.label),
    ["Public Site", "Member Area", "Admin"],
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

test("authenticated pending users see account access instead of sign-in", () => {
  const links = buildAreaSwitcherLinks({
    currentPath: "/account",
    currentArea: "member",
    role: "visitor",
    authenticated: true,
    canAccessMembersArea: false,
    accessState: "pending_approval",
  });

  assert.deepEqual(
    links.map((link) => link.label),
    ["Public Site", "Pending Account"],
  );
});
