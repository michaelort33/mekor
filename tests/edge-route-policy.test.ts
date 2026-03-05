import assert from "node:assert/strict";
import test from "node:test";

import { getEdgeProtectionType, isExplicitlyPublicPath } from "../lib/auth/edge-route-policy";

test("public paths remain unprotected", () => {
  assert.equal(isExplicitlyPublicPath("/membership"), true);
  assert.equal(isExplicitlyPublicPath("/community"), true);
  assert.equal(isExplicitlyPublicPath("/community/12"), true);
  assert.equal(getEdgeProtectionType("/login"), "none");
  assert.equal(getEdgeProtectionType("/invite/accept"), "none");
});

test("admin paths are admin-protected", () => {
  assert.equal(getEdgeProtectionType("/admin/users"), "admin");
  assert.equal(getEdgeProtectionType("/api/admin/users"), "admin");
});

test("members/account and event action APIs are user-protected", () => {
  assert.equal(getEdgeProtectionType("/account"), "user");
  assert.equal(getEdgeProtectionType("/members"), "user");
  assert.equal(getEdgeProtectionType("/api/account/profile"), "user");
  assert.equal(getEdgeProtectionType("/api/events/33/signup"), "user");
  assert.equal(getEdgeProtectionType("/api/events/33/checkout"), "user");
  assert.equal(getEdgeProtectionType("/api/events/33/cancel"), "user");
  assert.equal(getEdgeProtectionType("/api/events/33/ask-organizer"), "user");
  assert.equal(getEdgeProtectionType("/api/member-events/12/join"), "user");
  assert.equal(getEdgeProtectionType("/api/member-events/12/cancel"), "user");
  assert.equal(getEdgeProtectionType("/api/member-events/12/requests/44/approve"), "user");
  assert.equal(getEdgeProtectionType("/api/member-events/12/requests/44/reject"), "user");
});
