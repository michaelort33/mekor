import assert from "node:assert/strict";
import test from "node:test";

import { canShowEventSignupAction } from "../lib/events/signup-availability";

test("signup action is shown only for open events with enabled signup", () => {
  assert.equal(canShowEventSignupAction({ isClosed: false, signupEnabled: true }), true);
  assert.equal(canShowEventSignupAction({ isClosed: true, signupEnabled: true }), false);
  assert.equal(canShowEventSignupAction({ isClosed: false, signupEnabled: false }), false);
});
