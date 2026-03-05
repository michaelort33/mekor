import assert from "node:assert/strict";
import test from "node:test";

import { isNavigationPathActive, normalizeNavigationPath } from "../lib/navigation/path";

test("normalizeNavigationPath trims trailing slash except root", () => {
  assert.equal(normalizeNavigationPath(""), "/");
  assert.equal(normalizeNavigationPath("/"), "/");
  assert.equal(normalizeNavigationPath("/events/"), "/events");
});

test("isNavigationPathActive matches exact and nested routes", () => {
  assert.equal(isNavigationPathActive("/events", "/events"), true);
  assert.equal(isNavigationPathActive("/events/upcoming", "/events"), true);
  assert.equal(isNavigationPathActive("/about-us", "/events"), false);
  assert.equal(isNavigationPathActive("/", "/"), true);
});
