import assert from "node:assert/strict";
import test from "node:test";

import { allowWithinWindow } from "../lib/invitations/rate-limit";
import {
  INVITATION_TTL_HOURS,
  generateInvitationToken,
  hashInvitationToken,
  invitationExpiryFromNow,
} from "../lib/invitations/token";
import { sendInvitationEmail } from "../lib/invitations/email";

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

test("invitation emails are sent through SendGrid", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.SENDGRID_API_KEY;
  const originalFrom = process.env.SENDGRID_FROM_EMAIL;

  const calls: Array<{ url: string; init?: RequestInit }> = [];

  process.env.SENDGRID_API_KEY = "SG.test-key";
  process.env.SENDGRID_FROM_EMAIL = "admin@mekorhabracha.org";
  globalThis.fetch = async (input, init) => {
    calls.push({
      url: typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url,
      init,
    });
    return new Response(null, {
      status: 202,
      headers: { "x-message-id": "msg_123" },
    });
  };

  try {
    await sendInvitationEmail({
      toEmail: "newperson@example.com",
      inviterName: "admin@mekorhabracha.org",
      role: "super_admin",
      acceptUrl: "https://mekor.test/invite/accept?token=abc123",
      expiresAt: new Date("2026-03-06T12:00:00.000Z"),
    });
  } finally {
    globalThis.fetch = originalFetch;
    process.env.SENDGRID_API_KEY = originalApiKey;
    process.env.SENDGRID_FROM_EMAIL = originalFrom;
  }

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, "https://api.sendgrid.com/v3/mail/send");
  assert.equal(calls[0]?.init?.method, "POST");

  const body = JSON.parse(String(calls[0]?.init?.body));
  assert.equal(body.personalizations[0].to[0].email, "newperson@example.com");
  assert.equal(body.from.email, "admin@mekorhabracha.org");
  assert.equal(body.subject, "[Mekor] You're invited (super_admin)");
  assert.match(body.content[0].value, /https:\/\/mekor\.test\/invite\/accept\?token=abc123/);
});
