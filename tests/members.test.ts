import assert from "node:assert/strict";
import test from "node:test";

import {
  filterMembersDirectoryUsers,
  filterPublicDirectoryUsers,
  isVisibleInMembersDirectory,
} from "../lib/users/directory";

test("members directory only includes visible member/admin users", () => {
  const users = [
    { id: 1, role: "visitor", profileVisibility: "public" },
    { id: 2, role: "member", profileVisibility: "private" },
    { id: 3, role: "member", profileVisibility: "members" },
    { id: 4, role: "admin", profileVisibility: "anonymous" },
    { id: 5, role: "admin", profileVisibility: "public" },
  ] as const;

  const visible = filterMembersDirectoryUsers(users);
  assert.deepEqual(
    visible.map((user) => user.id),
    [3, 4, 5],
  );
});

test("visitor users never qualify for members directory visibility", () => {
  assert.equal(
    isVisibleInMembersDirectory({
      role: "visitor",
      profileVisibility: "members",
    }),
    false,
  );
});

test("public directory excludes members-only and private profiles", () => {
  const users = [
    { id: 1, role: "member", profileVisibility: "public" },
    { id: 2, role: "member", profileVisibility: "anonymous" },
    { id: 3, role: "member", profileVisibility: "members" },
    { id: 4, role: "member", profileVisibility: "private" },
    { id: 5, role: "visitor", profileVisibility: "public" },
  ] as const;

  const visible = filterPublicDirectoryUsers(users);
  assert.deepEqual(
    visible.map((user) => user.id),
    [1, 2],
  );
});
