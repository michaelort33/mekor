import assert from "node:assert/strict";
import test from "node:test";

import {
  USER_SESSION_MAX_AGE_SECONDS,
  USER_SESSION_REFRESH_WITHIN_SECONDS,
} from "../lib/auth/session-constants";
import { USER_SESSION_MAX_AGE } from "../lib/auth/session";
import { getValidUserSession, maybeAttachRefreshedUserSessionCookie } from "../lib/auth/edge-session";
import { NextResponse } from "next/server";
import { signUserSessionToken } from "../lib/auth/session";

const ONE_DAY = 60 * 60 * 24;

test("user sessions last at least 30 days", () => {
  assert.equal(USER_SESSION_MAX_AGE_SECONDS, 30 * ONE_DAY);
  assert.equal(USER_SESSION_MAX_AGE, USER_SESSION_MAX_AGE_SECONDS);
  assert.ok(USER_SESSION_REFRESH_WITHIN_SECONDS < USER_SESSION_MAX_AGE_SECONDS);
  assert.ok(USER_SESSION_REFRESH_WITHIN_SECONDS >= 7 * ONE_DAY);
});

test("near-expiry sessions are refreshed with a new 30-day cookie", async () => {
  const previousSecret = process.env.USER_SESSION_SECRET;
  const previousEnv = process.env.NODE_ENV;
  process.env.USER_SESSION_SECRET = "session-duration-test-secret";
  process.env.NODE_ENV = "test";

  try {
    const soon = Date.now() + 2 * ONE_DAY * 1000;
    const token = await signUserSessionToken(
      { userId: 42, role: "admin", exp: soon },
      process.env.USER_SESSION_SECRET,
    );

    const response = NextResponse.next();
    const next = await maybeAttachRefreshedUserSessionCookie(response, token);
    const setCookie = next.cookies.get("mekor_user_session");
    assert.ok(setCookie?.value, "expected a refreshed session cookie");
    assert.notEqual(setCookie.value, token);

    const refreshed = await getValidUserSession(setCookie.value);
    assert.ok(refreshed);
    assert.equal(refreshed.userId, 42);
    assert.equal(refreshed.role, "admin");
    assert.ok(refreshed.exp - Date.now() > 29 * ONE_DAY * 1000);
  } finally {
    if (previousSecret === undefined) delete process.env.USER_SESSION_SECRET;
    else process.env.USER_SESSION_SECRET = previousSecret;
    if (previousEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnv;
  }
});
