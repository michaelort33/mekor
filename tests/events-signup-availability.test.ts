import assert from "node:assert/strict";
import test from "node:test";

import { canShowEventSignupAction } from "../lib/events/signup-availability";
import { isEventPast } from "../lib/events/status";

test("signup action is shown only for open events with enabled signup", () => {
  assert.equal(canShowEventSignupAction({ isClosed: false, signupEnabled: true }), true);
  assert.equal(canShowEventSignupAction({ isClosed: true, signupEnabled: true }), false);
  assert.equal(canShowEventSignupAction({ isClosed: false, signupEnabled: false }), false);
});

test("signup action is hidden after the event start time or deadline passes", () => {
  assert.equal(
    canShowEventSignupAction({
      isClosed: false,
      signupEnabled: true,
      startAt: "2000-01-01T12:00:00.000Z",
    }),
    false,
  );

  assert.equal(
    canShowEventSignupAction({
      isClosed: false,
      signupEnabled: true,
      startAt: "2999-01-01T12:00:00.000Z",
      registrationDeadline: "2000-01-01T10:00:00.000Z",
    }),
    false,
  );
});

test("event is treated as past once end time or start time has passed", () => {
  assert.equal(isEventPast({ startAt: "2000-01-01T12:00:00.000Z", endAt: null }), true);
  assert.equal(
    isEventPast({
      startAt: "2000-01-01T12:00:00.000Z",
      endAt: "2999-01-01T12:00:00.000Z",
    }),
    false,
  );
});
