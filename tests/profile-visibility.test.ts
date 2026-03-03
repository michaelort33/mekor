import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { PROFILE_VISIBILITY_CONFIG } from "../lib/profile-visibility/config";
import {
  canViewProfile,
  getProfileVisibility,
  isProfileSearchVisible,
  normalizeProfilePolicyPath,
} from "../lib/profile-visibility/policy";
import type { ProfileVisibilityConfigEntry } from "../lib/profile-visibility/types";

const PUBLIC_ALLOWLIST_PATH = "/profile/rabbiehirsch/profile";

async function withTemporaryVisibility(
  profilePath: string,
  entry: ProfileVisibilityConfigEntry,
  run: () => void | Promise<void>,
) {
  const previous = PROFILE_VISIBILITY_CONFIG[profilePath];
  PROFILE_VISIBILITY_CONFIG[profilePath] = entry;
  try {
    await run();
  } finally {
    if (previous === undefined) {
      delete PROFILE_VISIBILITY_CONFIG[profilePath];
      return;
    }

    PROFILE_VISIBILITY_CONFIG[profilePath] = previous;
  }
}

test("getProfileVisibility returns private for missing entries", () => {
  const visibility = getProfileVisibility("/profile/nonexistent-user/profile");
  assert.equal(visibility.visibility, "private");
});

test("public allowlist profile remains viewable", () => {
  assert.equal(canViewProfile(PUBLIC_ALLOWLIST_PATH, "public"), true);
  assert.equal(
    canViewProfile(`${PUBLIC_ALLOWLIST_PATH}?disableScrollToTop=true`, "public"),
    true,
  );
});

test("members-only profile is not public but is member-viewable", async () => {
  const membersPath = "/profile/test-members/profile";
  await withTemporaryVisibility(membersPath, { visibility: "members_only" }, () => {
    assert.equal(canViewProfile(membersPath, "public"), false);
    assert.equal(canViewProfile(membersPath, "member"), true);
    assert.equal(isProfileSearchVisible(membersPath, "public"), false);
    assert.equal(isProfileSearchVisible(membersPath, "member"), true);
  });
});

test("anonymous profile is non-viewable in this phase", async () => {
  const anonymousPath = "/profile/test-anonymous/profile";
  await withTemporaryVisibility(anonymousPath, {
    visibility: "anonymous",
    anonymousCard: {
      role: "Community Volunteer",
      neighborhood: "Center City",
    },
  }, () => {
    assert.equal(canViewProfile(anonymousPath, "public"), false);
    assert.equal(canViewProfile(anonymousPath, "member"), false);
    assert.equal(isProfileSearchVisible(anonymousPath, "public"), false);
  });
});

test("normalizeProfilePolicyPath strips query params", () => {
  assert.equal(
    normalizeProfilePolicyPath("/profile/rabbiehirsch/profile?disableScrollToTop=true"),
    "/profile/rabbiehirsch/profile",
  );
});

test("search visibility filtering excludes non-public profile records", async () => {
  const membersPath = "/profile/test-members-search/profile";
  const anonymousPath = "/profile/test-anonymous-search/profile";

  await withTemporaryVisibility(membersPath, { visibility: "members_only" }, async () => {
    await withTemporaryVisibility(
      anonymousPath,
      {
        visibility: "anonymous",
        anonymousCard: {
          role: "Board Member",
          neighborhood: "Center City",
        },
      },
      () => {
        const records = [
          { path: "/events", type: "page" },
          { path: PUBLIC_ALLOWLIST_PATH, type: "profile" },
          { path: membersPath, type: "profile" },
          { path: anonymousPath, type: "profile" },
        ];

        const visiblePaths = records
          .filter(
            (record) => record.type !== "profile" || isProfileSearchVisible(record.path, "public"),
          )
          .map((record) => record.path);

        assert.deepEqual(visiblePaths, ["/events", PUBLIC_ALLOWLIST_PATH]);
      },
    );
  });
});

test("profile page applies visibility gating and 404 behavior", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "app/profile/[...parts]/page.tsx"), "utf8");
  assert.equal(source.includes("if (!canViewProfile(item.path, PUBLIC_AUDIENCE))"), true);
  assert.equal(source.includes("if (!canViewProfile(route.document.path, PUBLIC_AUDIENCE))"), true);
  assert.equal(source.includes("notFound();"), true);
});

test("search page filters profile records via visibility policy", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "app/search/page.tsx"), "utf8");
  assert.equal(source.includes("isProfileSearchVisible"), true);
  assert.equal(
    source.includes('record.type !== "profile" || isProfileSearchVisible(record.path, PUBLIC_AUDIENCE)'),
    true,
  );
});
