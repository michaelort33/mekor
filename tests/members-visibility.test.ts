import assert from "node:assert/strict";
import test from "node:test";

import { MEMBER_PROFILE_SLUG_PATTERN, isLikelyNameDerivedSlug } from "../lib/members/store";
import { toPublicProfileView, isVisibleInPublicDirectory } from "../lib/members/visibility";

test("visibility matrix enforces private and members-only gating for public viewer", () => {
  const publicViewer = { isMember: false };
  const memberViewer = { isMember: true };

  assert.equal(isVisibleInPublicDirectory({ visibility: "private" }, publicViewer), false);
  assert.equal(isVisibleInPublicDirectory({ visibility: "members_only" }, publicViewer), false);
  assert.equal(isVisibleInPublicDirectory({ visibility: "public" }, publicViewer), true);
  assert.equal(isVisibleInPublicDirectory({ visibility: "anonymous" }, publicViewer), true);

  assert.equal(isVisibleInPublicDirectory({ visibility: "members_only" }, memberViewer), true);
});

test("anonymous public projection masks identifying fields", () => {
  const projected = toPublicProfileView({
    slug: "community-member-abc12345",
    fullName: "Jane Doe",
    avatarUrl: "https://example.com/avatar.png",
    bio: "Learning and volunteering.",
    interests: ["Learning", "Chesed"],
    city: "Philadelphia",
    email: "jane@example.com",
    phone: "555-0101",
    visibility: "anonymous",
  });

  assert.equal(projected.displayName, "Community Member");
  assert.equal(projected.city, null);
  assert.equal(projected.email, null);
  assert.equal(projected.phone, null);
  assert.equal(projected.isAnonymous, true);
});

test("public projection keeps details for non-anonymous profile", () => {
  const projected = toPublicProfileView({
    slug: "jane-doe",
    fullName: "Jane Doe",
    avatarUrl: "",
    bio: "",
    interests: [],
    city: "Philadelphia",
    email: "jane@example.com",
    phone: "555-0101",
    visibility: "public",
  });

  assert.equal(projected.displayName, "Jane Doe");
  assert.equal(projected.city, "Philadelphia");
  assert.equal(projected.email, "jane@example.com");
  assert.equal(projected.phone, "555-0101");
  assert.equal(projected.isAnonymous, false);
});

test("slug helpers detect likely name-derived slugs", () => {
  assert.equal(MEMBER_PROFILE_SLUG_PATTERN.test("jane-doe"), true);
  assert.equal(MEMBER_PROFILE_SLUG_PATTERN.test("Jane Doe"), false);
  assert.equal(isLikelyNameDerivedSlug("jane-doe", "Jane Doe"), true);
  assert.equal(isLikelyNameDerivedSlug("community-member-a1b2c3d4", "Jane Doe"), false);
});
