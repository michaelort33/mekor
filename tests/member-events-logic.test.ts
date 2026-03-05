import assert from "node:assert/strict";
import test from "node:test";

import { calculateAttendanceRate, resolveMemberEventJoinStatus } from "../lib/member-events/logic";

test("resolveMemberEventJoinStatus returns approved/requested/waitlisted correctly", () => {
  assert.equal(resolveMemberEventJoinStatus({ joinMode: "open_join", atCapacity: false }), "approved");
  assert.equal(resolveMemberEventJoinStatus({ joinMode: "request_to_join", atCapacity: false }), "requested");
  assert.equal(resolveMemberEventJoinStatus({ joinMode: "open_join", atCapacity: true }), "waitlisted");
});

test("calculateAttendanceRate returns 0 when capacity is zero and rounded ratio otherwise", () => {
  assert.equal(calculateAttendanceRate({ approvedAttendeesTotal: 10, capacityTotal: 0 }), 0);
  assert.equal(calculateAttendanceRate({ approvedAttendeesTotal: 3, capacityTotal: 8 }), 0.375);
});
