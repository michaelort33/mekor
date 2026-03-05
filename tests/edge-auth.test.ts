import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import { signUserSessionToken } from "../lib/auth/session";
import { proxy } from "../proxy";

test("GET /members without user cookie redirects to login", async () => {
  const request = new NextRequest("http://localhost:3000/members");
  const response = await proxy(request);

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost:3000/login?next=%2Fmembers");
});

test("GET /admin/users without user cookie redirects to login", async () => {
  const request = new NextRequest("http://localhost:3000/admin/users");
  const response = await proxy(request);

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost:3000/login?next=%2Fadmin%2Fusers");
});

test("POST /api/account/profile without user cookie returns 401", async () => {
  const request = new NextRequest("http://localhost:3000/api/account/profile", {
    method: "POST",
  });
  const response = await proxy(request);

  assert.equal(response.status, 401);
});

test("POST /api/events/:id/signup without user cookie returns 401", async () => {
  const request = new NextRequest("http://localhost:3000/api/events/12/signup", {
    method: "POST",
  });
  const response = await proxy(request);

  assert.equal(response.status, 401);
});

test("POST /api/member-events/:id/join without user cookie returns 401", async () => {
  const request = new NextRequest("http://localhost:3000/api/member-events/9/join", {
    method: "POST",
  });
  const response = await proxy(request);

  assert.equal(response.status, 401);
});

test("POST /api/families/invites without user cookie returns 401", async () => {
  const request = new NextRequest("http://localhost:3000/api/families/invites", {
    method: "POST",
  });
  const response = await proxy(request);

  assert.equal(response.status, 401);
});

test("GET /api/inbox/threads without user cookie returns 401", async () => {
  const request = new NextRequest("http://localhost:3000/api/inbox/threads");
  const response = await proxy(request);

  assert.equal(response.status, 401);
});

test("GET /membership remains public", async () => {
  const request = new NextRequest("http://localhost:3000/membership");
  const response = await proxy(request);

  assert.equal(response.status, 200);
});

test("expired session token is rejected and cookie is cleared", async () => {
  process.env.USER_SESSION_SECRET = "test-user-session-secret";
  const token = await signUserSessionToken(
    {
      userId: 7,
      role: "member",
      exp: Date.now() - 1000,
    },
    process.env.USER_SESSION_SECRET,
  );

  const request = new NextRequest("http://localhost:3000/members", {
    headers: {
      cookie: `mekor_user_session=${token}`,
    },
  });
  const response = await proxy(request);

  assert.equal(response.status, 307);
  assert.match(response.headers.get("set-cookie") ?? "", /mekor_user_session=;/);
});

test("valid admin user session token allows admin route through edge", async () => {
  process.env.USER_SESSION_SECRET = "test-user-session-secret";
  const token = await signUserSessionToken(
    {
      userId: 99,
      role: "super_admin",
      exp: Date.now() + 60_000,
    },
    process.env.USER_SESSION_SECRET,
  );
  const request = new NextRequest("http://localhost:3000/admin/users", {
    headers: {
      cookie: `mekor_user_session=${token}`,
    },
  });

  const response = await proxy(request);
  assert.equal(response.status, 200);
});

test("non-admin user session token is redirected away from admin route", async () => {
  process.env.USER_SESSION_SECRET = "test-user-session-secret";
  const token = await signUserSessionToken(
    {
      userId: 100,
      role: "member",
      exp: Date.now() + 60_000,
    },
    process.env.USER_SESSION_SECRET,
  );
  const request = new NextRequest("http://localhost:3000/admin/users", {
    headers: {
      cookie: `mekor_user_session=${token}`,
    },
  });

  const response = await proxy(request);
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost:3000/login?next=%2Fadmin%2Fusers");
});
