import type { NextResponse } from "next/server";

import {
  USER_SESSION_MAX_AGE_SECONDS,
  USER_SESSION_REFRESH_WITHIN_SECONDS,
} from "@/lib/auth/session-constants";

export const ADMIN_SESSION_COOKIE = "mekor_admin_session";
export const USER_SESSION_COOKIE = "mekor_user_session";
export type EdgeUserRole = "visitor" | "member" | "admin" | "super_admin";

export type EdgeUserSession = {
  userId: number;
  role: EdgeUserRole;
  exp: number;
};

function toArrayBuffer(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function getSecret(secretValue: string | undefined) {
  if (!secretValue) return null;
  return toArrayBuffer(new TextEncoder().encode(secretValue.padEnd(32, "0").slice(0, 32)));
}

async function verifyToken(token: string, secret: ArrayBuffer) {
  const [encodedPayload, sigHex] = token.split(".");
  if (!encodedPayload || !sigHex) return null;
  if (sigHex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(sigHex)) return null;

  let payload: string;
  try {
    payload = atob(encodedPayload);
  } catch {
    return null;
  }

  const key = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const sigPairs = sigHex.match(/.{2}/g);
  if (!sigPairs) return null;

  const sigBytes = new Uint8Array(sigPairs.map((h) => Number.parseInt(h, 16)));
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    toArrayBuffer(sigBytes),
    toArrayBuffer(new TextEncoder().encode(payload)),
  );
  if (!valid) return null;

  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function hasValidAdminSession(token: string) {
  const secret = getSecret(process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD);
  if (!secret) return false;

  const parsed = await verifyToken(token, secret);
  if (!parsed) return false;

  const role = parsed.role;
  const exp = parsed.exp;
  if (typeof exp === "number" && Date.now() > exp) return false;
  return role === "admin";
}

export async function hasValidUserSession(token: string) {
  const secret = getSecret(process.env.USER_SESSION_SECRET);
  if (!secret) return false;

  const parsed = await verifyToken(token, secret);
  if (!parsed) return false;

  const userId = parsed.userId;
  const role = parsed.role;
  const exp = parsed.exp;
  if (!Number.isInteger(userId) || Number(userId) < 1) return false;
  if (role !== "visitor" && role !== "member" && role !== "admin" && role !== "super_admin") return false;
  if (typeof exp !== "number" || Date.now() > exp) return false;

  return true;
}

export async function getValidUserSession(token: string): Promise<EdgeUserSession | null> {
  const secret = getSecret(process.env.USER_SESSION_SECRET);
  if (!secret) return null;

  const parsed = await verifyToken(token, secret);
  if (!parsed) return null;

  const userId = parsed.userId;
  const role = parsed.role;
  const exp = parsed.exp;
  if (!Number.isInteger(userId) || Number(userId) < 1) return null;
  if (role !== "visitor" && role !== "member" && role !== "admin" && role !== "super_admin") return null;
  if (typeof exp !== "number" || Date.now() > exp) return null;

  return {
    userId: Number(userId),
    role,
    exp,
  };
}

export async function getValidUserSessionRole(token: string): Promise<EdgeUserRole | null> {
  const session = await getValidUserSession(token);
  return session?.role ?? null;
}

async function signUserSessionToken(payload: EdgeUserSession, secret: ArrayBuffer) {
  // Must match lib/auth/session.ts: HMAC over the raw JSON string, then base64(json).hex(sig).
  const json = JSON.stringify(payload);
  const key = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, toArrayBuffer(new TextEncoder().encode(json)));
  const sigHex = Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `${btoa(json)}.${sigHex}`;
}

/**
 * If the session is valid but nearing expiry, attach a refreshed cookie so active
 * browsers stay signed in for another full USER_SESSION_MAX_AGE_SECONDS window.
 */
export async function maybeAttachRefreshedUserSessionCookie(
  response: NextResponse,
  token: string,
): Promise<NextResponse> {
  const secretValue = process.env.USER_SESSION_SECRET;
  const secret = getSecret(secretValue);
  if (!secret) return response;

  const session = await getValidUserSession(token);
  if (!session) return response;

  const remainingMs = session.exp - Date.now();
  if (remainingMs > USER_SESSION_REFRESH_WITHIN_SECONDS * 1000) {
    return response;
  }

  const refreshed: EdgeUserSession = {
    userId: session.userId,
    role: session.role,
    exp: Date.now() + USER_SESSION_MAX_AGE_SECONDS * 1000,
  };
  const nextToken = await signUserSessionToken(refreshed, secret);
  response.cookies.set(USER_SESSION_COOKIE, nextToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: USER_SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
