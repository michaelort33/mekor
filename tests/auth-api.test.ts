import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import { executeLogin } from "../app/api/auth/login/route";
import { executeSignup } from "../app/api/auth/signup/route";
import { proxy } from "../proxy";

test("signup rejects duplicate email with 409", async () => {
  const result = await executeSignup(
    {
      displayName: "Alice",
      email: "alice@example.com",
      password: "password123",
      confirmPassword: "password123",
    },
    {
      assertSessionConfigured: () => {},
      findUserByEmail: async () => ({ id: 3 }),
      createUser: async () => {
        throw new Error("createUser should not run for duplicate email");
      },
      hashPassword: async () => {
        throw new Error("hashPassword should not run for duplicate email");
      },
      createSession: async () => {},
    },
  );

  assert.equal(result.status, 409);
  assert.deepEqual(result.body, { error: "Email already registered" });
});

test("signup fails fast when USER_SESSION_SECRET is not configured", async () => {
  const result = await executeSignup(
    {
      displayName: "Alice",
      email: "alice@example.com",
      password: "password123",
      confirmPassword: "password123",
    },
    {
      assertSessionConfigured: () => {
        throw new Error("USER_SESSION_SECRET is required");
      },
      findUserByEmail: async () => {
        throw new Error("findUserByEmail should not run when session config is missing");
      },
      createUser: async () => {
        throw new Error("createUser should not run when session config is missing");
      },
      hashPassword: async () => {
        throw new Error("hashPassword should not run when session config is missing");
      },
      createSession: async () => {},
    },
  );

  assert.equal(result.status, 500);
  assert.deepEqual(result.body, { error: "Auth session is not configured" });
});

test("signup stays successful when people schema is missing", async () => {
  const steps: string[] = [];
  const result = await executeSignup(
    {
      displayName: "Alice",
      email: "alice@example.com",
      password: "password123",
      confirmPassword: "password123",
    },
    {
      assertSessionConfigured: () => {},
      findUserByEmail: async () => undefined,
      createUser: async () => ({
        id: 44,
        email: "alice@example.com",
        displayName: "Alice",
        role: "member",
      }),
      hashPassword: async () => "hash",
      createSession: async () => {
        steps.push("session");
      },
      ensurePersonForUser: async () => {
        throw new Error('relation "people" does not exist');
      },
    },
  );

  assert.equal(result.status, 201);
  assert.deepEqual(result.body, {
    ok: true,
    user: {
      id: 44,
      email: "alice@example.com",
      displayName: "Alice",
      role: "member",
    },
  });
  assert.deepEqual(steps, ["session"]);
});

test("login returns 401 when credentials are invalid", async () => {
  const noUser = await executeLogin(
    {
      email: "unknown@example.com",
      password: "password123",
    },
    {
      assertSessionConfigured: () => {},
      findUserByEmail: async () => undefined,
      verifyPassword: async () => true,
      markUserLoggedIn: async () => {},
      createSession: async () => {},
    },
  );
  assert.equal(noUser.status, 401);

  const wrongPassword = await executeLogin(
    {
      email: "alice@example.com",
      password: "wrong-password",
    },
    {
      assertSessionConfigured: () => {},
      findUserByEmail: async () => ({
        id: 1,
        email: "alice@example.com",
        displayName: "Alice",
        role: "visitor",
        passwordHash: "fake",
      }),
      verifyPassword: async () => false,
      markUserLoggedIn: async () => {},
      createSession: async () => {},
    },
  );
  assert.equal(wrongPassword.status, 401);
});

test("login succeeds and creates session when credentials are valid", async () => {
  const steps: string[] = [];
  const result = await executeLogin(
    {
      email: "alice@example.com",
      password: "password123",
    },
    {
      assertSessionConfigured: () => {
        steps.push("configured");
      },
      findUserByEmail: async (email) => {
        steps.push(`find:${email}`);
        return {
          id: 22,
          email: "alice@example.com",
          displayName: "Alice",
          role: "member",
          passwordHash: "stored-hash",
        };
      },
      verifyPassword: async () => {
        steps.push("verify");
        return true;
      },
      markUserLoggedIn: async (userId) => {
        steps.push(`mark:${userId}`);
      },
      createSession: async ({ userId, role }) => {
        steps.push(`session:${userId}:${role}`);
      },
    },
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    user: {
      id: 22,
      email: "alice@example.com",
      displayName: "Alice",
      role: "member",
    },
  });
  assert.deepEqual(steps, [
    "configured",
    "find:alice@example.com",
    "verify",
    "mark:22",
    "session:22:member",
  ]);
});

test("admin users API is gated without admin session cookie", async () => {
  const request = new NextRequest("http://localhost:3000/api/admin/users");
  const response = await proxy(request);
  assert.equal(response.status, 401);
});
