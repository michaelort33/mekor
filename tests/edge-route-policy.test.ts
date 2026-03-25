import assert from "node:assert/strict";
import test from "node:test";

import { getEdgeProtectionType, isExplicitlyPublicPath } from "../lib/auth/edge-route-policy";

test("public paths remain unprotected", () => {
  assert.equal(isExplicitlyPublicPath("/membership"), true);
  assert.equal(isExplicitlyPublicPath("/membership/apply"), true);
  assert.equal(isExplicitlyPublicPath("/community"), true);
  assert.equal(isExplicitlyPublicPath("/community/12"), true);
  assert.equal(getEdgeProtectionType("/login"), "none");
  assert.equal(getEdgeProtectionType("/forgot-password"), "none");
  assert.equal(getEdgeProtectionType("/reset-password"), "none");
  assert.equal(getEdgeProtectionType("/membership/apply"), "none");
  assert.equal(getEdgeProtectionType("/invite/accept"), "none");
});

test("admin paths are admin-protected", () => {
  assert.equal(getEdgeProtectionType("/admin/users"), "admin");
  assert.equal(getEdgeProtectionType("/api/admin/users"), "admin");
});

test("account basics are authenticated and member tools are member-protected", () => {
  assert.equal(getEdgeProtectionType("/account"), "authenticated");
  assert.equal(getEdgeProtectionType("/account/profile"), "authenticated");
  assert.equal(getEdgeProtectionType("/members"), "member");
  assert.equal(getEdgeProtectionType("/account/dues"), "member");
  assert.equal(getEdgeProtectionType("/api/account/profile"), "authenticated");
  assert.equal(getEdgeProtectionType("/api/account/dashboard"), "authenticated");
  assert.equal(getEdgeProtectionType("/api/account/dues"), "member");
  assert.equal(getEdgeProtectionType("/api/member-events/12/join"), "member");
  assert.equal(getEdgeProtectionType("/api/member-events/12/cancel"), "member");
  assert.equal(getEdgeProtectionType("/api/member-events/12/requests/44/approve"), "member");
  assert.equal(getEdgeProtectionType("/api/member-events/12/requests/44/reject"), "member");
  assert.equal(getEdgeProtectionType("/api/events/33/signup"), "authenticated");
  assert.equal(getEdgeProtectionType("/api/events/33/checkout"), "authenticated");
  assert.equal(getEdgeProtectionType("/api/events/33/cancel"), "authenticated");
  assert.equal(getEdgeProtectionType("/api/events/33/ask-organizer"), "authenticated");
});
