import assert from "node:assert/strict";
import test from "node:test";

import { allowWithinWindow } from "../lib/invitations/rate-limit";
import {
  INVITATION_TTL_HOURS,
  generateInvitationToken,
  hashInvitationToken,
  invitationExpiryFromNow,
} from "../lib/invitations/token";

test("invitation token generation returns unique high-entropy tokens", () => {
  const tokenA = generateInvitationToken();
  const tokenB = generateInvitationToken();

  assert.notEqual(tokenA, tokenB);
  assert.ok(tokenA.length >= 32);
  assert.ok(tokenB.length >= 32);
});

test("invitation token hashing is deterministic", () => {
  const token = "test-token-value";
  assert.equal(hashInvitationToken(token), hashInvitationToken(token));
  assert.notEqual(hashInvitationToken(token), hashInvitationToken(`${token}-other`));
});

test("invitation expiry defaults to 72 hours", () => {
  const before = Date.now();
  const expiresAt = invitationExpiryFromNow().getTime();
  const after = Date.now();
  const expectedMs = INVITATION_TTL_HOURS * 60 * 60 * 1000;

  assert.ok(expiresAt >= before + expectedMs);
  assert.ok(expiresAt <= after + expectedMs);
});

test("invitation accept limiter blocks after configured attempts", () => {
  const key = `rate-limit-test-${Date.now()}`;
  assert.equal(allowWithinWindow(key, 2, 60_000), true);
  assert.equal(allowWithinWindow(key, 2, 60_000), true);
  assert.equal(allowWithinWindow(key, 2, 60_000), false);
});
