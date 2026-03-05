import test from "node:test";
import assert from "node:assert/strict";

import { MESSAGE_SEGMENT_LABELS, MESSAGE_SEGMENTS } from "@/lib/messages/segments";
import { userRoleToPersonStatus } from "@/lib/people/status";

test("userRoleToPersonStatus maps account roles to person statuses", () => {
  assert.equal(userRoleToPersonStatus("visitor"), "visitor");
  assert.equal(userRoleToPersonStatus("member"), "member");
  assert.equal(userRoleToPersonStatus("admin"), "admin");
  assert.equal(userRoleToPersonStatus("super_admin"), "super_admin");
});

test("message segment labels cover all configured segments", () => {
  for (const key of MESSAGE_SEGMENTS) {
    assert.ok(MESSAGE_SEGMENT_LABELS[key]);
  }
});
