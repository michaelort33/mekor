import assert from "node:assert/strict";
import test from "node:test";

import { hashPassword, verifyPassword } from "../lib/auth/password";
import { signUserSessionToken, verifyUserSessionToken } from "../lib/auth/session";
import {
  loginPayloadSchema,
  profileUpdatePayloadSchema,
  signupPayloadSchema,
} from "../lib/users/validation";

test("password hashing verifies correct password and rejects wrong password", async () => {
  const hash = await hashPassword("super-secret-password");
  assert.equal(await verifyPassword("super-secret-password", hash), true);
  assert.equal(await verifyPassword("wrong-password", hash), false);
});

test("user session token verification supports valid token", async () => {
  const token = await signUserSessionToken(
    {
      userId: 42,
      role: "member",
      exp: Date.now() + 60_000,
    },
    "test-user-secret",
  );

  const payload = await verifyUserSessionToken(token, "test-user-secret");
  assert.ok(payload);
  assert.equal(payload?.userId, 42);
  assert.equal(payload?.role, "member");
});

test("user session token verification rejects tampered or expired token", async () => {
  const token = await signUserSessionToken(
    {
      userId: 7,
      role: "visitor",
      exp: Date.now() + 60_000,
    },
    "test-user-secret",
  );

  const tampered = `${token}ff`;
  assert.equal(await verifyUserSessionToken(tampered, "test-user-secret"), null);

  const expired = await signUserSessionToken(
    {
      userId: 7,
      role: "visitor",
      exp: Date.now() - 1_000,
    },
    "test-user-secret",
  );
  assert.equal(await verifyUserSessionToken(expired, "test-user-secret"), null);
});

test("auth payload schemas enforce expected validation rules", () => {
  assert.equal(
    signupPayloadSchema.safeParse({
      displayName: "Alice",
      email: "alice@example.com",
      password: "password123",
      confirmPassword: "password123",
    }).success,
    true,
  );
  assert.equal(
    signupPayloadSchema.safeParse({
      displayName: "Alice",
      email: "alice@example.com",
      password: "password123",
      confirmPassword: "not-matching",
    }).success,
    false,
  );

  assert.equal(
    loginPayloadSchema.safeParse({
      email: "alice@example.com",
      password: "x",
    }).success,
    true,
  );
  assert.equal(
    loginPayloadSchema.safeParse({
      email: "not-an-email",
      password: "x",
    }).success,
    false,
  );

  assert.equal(
    profileUpdatePayloadSchema.safeParse({
      displayName: "Alice",
      bio: "Shul member",
      city: "Philadelphia",
      avatarUrl: "",
      profileVisibility: "members",
    }).success,
    true,
  );
  assert.equal(
    profileUpdatePayloadSchema.safeParse({
      displayName: "Alice",
      bio: "Shul member",
      city: "Philadelphia",
      avatarUrl: "not-a-url",
      profileVisibility: "members",
    }).success,
    false,
  );
});
