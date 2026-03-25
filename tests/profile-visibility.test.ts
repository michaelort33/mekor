import assert from "node:assert/strict";
import test from "node:test";

import {
  getVisibleProfileValue,
  normalizeProfileDetails,
  normalizeProfileFieldVisibility,
} from "../lib/users/profile";

test("legacy profile fields default to public visibility", () => {
  const visibility = normalizeProfileFieldVisibility({});

  assert.equal(visibility.displayName, "public");
  assert.equal(visibility.bio, "public");
  assert.equal(visibility.city, "public");
  assert.equal(visibility.avatarUrl, "public");
});

test("new host-style profile fields default to private visibility", () => {
  const visibility = normalizeProfileFieldVisibility({});

  assert.equal(visibility.school, "private");
  assert.equal(visibility.occupation, "private");
  assert.equal(visibility.interests, "private");
  assert.equal(visibility.hobbies, "private");
  assert.equal(visibility.funFacts, "private");
});

test("public field remains hidden when global profile visibility is private", () => {
  const value = getVisibleProfileValue({
    value: "University of Pennsylvania",
    profileVisibility: "private",
    fieldVisibility: "public",
    audience: "public",
  });

  assert.equal(value, "");
});

test("members-only global visibility still allows public field within members area", () => {
  const value = getVisibleProfileValue({
    value: "Cycling and cooking",
    profileVisibility: "members",
    fieldVisibility: "public",
    audience: "members",
  });

  assert.equal(value, "Cycling and cooking");
});

test("field marked private stays hidden even when profile is public", () => {
  const value = getVisibleProfileValue({
    value: "I collect vintage siddurim",
    profileVisibility: "public",
    fieldVisibility: "private",
    audience: "public",
  });

  assert.equal(value, "");
});

test("profile details normalize missing values to empty strings", () => {
  assert.deepEqual(normalizeProfileDetails({ school: "Test School" }), {
    school: "Test School",
    occupation: "",
    interests: "",
    hobbies: "",
    funFacts: "",
  });
});
