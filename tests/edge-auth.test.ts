import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import { signUserSessionToken } from "../lib/auth/session";
import { proxy } from "../proxy";

async function signAdminToken(secret: string, exp: number) {
  const payload = JSON.stringify({ role: "admin", exp });
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret.padEnd(32, "0").slice(0, 32)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const sigHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `${Buffer.from(payload).toString("base64")}.${sigHex}`;
}

test("GET /members without user cookie redirects to login", async () => {
  const request = new NextRequest("http://localhost:3000/members");
  const response = await proxy(request);

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost:3000/login?next=%2Fmembers");
});

test("GET /admin/users without admin cookie redirects to /admin/login", async () => {
  const request = new NextRequest("http://localhost:3000/admin/users");
  const response = await proxy(request);

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://localhost:3000/admin/login");
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

test("valid admin session token allows admin route through edge", async () => {
  process.env.ADMIN_SESSION_SECRET = "test-admin-session-secret";
  const token = await signAdminToken(process.env.ADMIN_SESSION_SECRET, Date.now() + 60_000);
  const request = new NextRequest("http://localhost:3000/admin/users", {
    headers: {
      cookie: `mekor_admin_session=${token}`,
    },
  });

  const response = await proxy(request);
  assert.equal(response.status, 200);
});
