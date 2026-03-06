import assert from "node:assert/strict";
import test from "node:test";

import { buildAreaSwitcherLinks, detectAppArea } from "../lib/navigation/area-switcher";

test("detectAppArea distinguishes public, member, and admin paths", () => {
  assert.equal(detectAppArea("/"), "site");
  assert.equal(detectAppArea("/membership"), "site");
  assert.equal(detectAppArea("/account/dues"), "member");
  assert.equal(detectAppArea("/members/24"), "member");
  assert.equal(detectAppArea("/admin/settings"), "admin");
});

test("buildAreaSwitcherLinks exposes member and admin destinations for privileged users", () => {
  const links = buildAreaSwitcherLinks({
    currentPath: "/admin",
    currentArea: "admin",
    role: "super_admin",
  });

  assert.deepEqual(
    links.map((link) => ({
      label: link.label,
      href: link.href,
      current: link.current,
      requiresSignIn: link.requiresSignIn,
    })),
    [
      { label: "Public Site", href: "/", current: false, requiresSignIn: false },
      { label: "Member Area", href: "/account", current: false, requiresSignIn: false },
      { label: "Admin", href: "/admin", current: true, requiresSignIn: false },
    ],
  );
});

test("buildAreaSwitcherLinks falls back to sign-in links on the public site", () => {
  const links = buildAreaSwitcherLinks({
    currentPath: "/",
    currentArea: "site",
    role: null,
    includeSignInLinks: true,
  });

  assert.deepEqual(
    links.map((link) => ({
      label: link.label,
      href: link.href,
      current: link.current,
      requiresSignIn: link.requiresSignIn,
    })),
    [
      { label: "Public Site", href: "/", current: true, requiresSignIn: false },
      { label: "Member Sign In", href: "/login?next=%2Faccount", current: false, requiresSignIn: true },
      { label: "Admin Sign In", href: "/login?next=%2Fadmin", current: false, requiresSignIn: true },
    ],
  );
});
