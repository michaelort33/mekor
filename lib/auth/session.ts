import { cookies } from "next/headers";

export const USER_SESSION_COOKIE = "mekor_user_session";
export const USER_SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type UserSessionRole = "visitor" | "member" | "admin";

export type UserSessionTokenPayload = {
  userId: number;
  role: UserSessionRole;
  exp: number;
};

export type UserSession = {
  userId: number;
  role: UserSessionRole;
};

function getSessionSecretOrThrow() {
  const secret = process.env.USER_SESSION_SECRET;
  if (!secret) {
    throw new Error("USER_SESSION_SECRET is required");
  }
  return secret;
}

function toSecretBytes(secret: string) {
  return new TextEncoder().encode(secret.padEnd(32, "0").slice(0, 32));
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    toSecretBytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const sigHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${btoa(payload)}.${sigHex}`;
}

async function verify(token: string, secret: string): Promise<UserSessionTokenPayload | null> {
  const [encodedPayload, sigHex] = token.split(".");
  if (!encodedPayload || !sigHex) return null;
  if (sigHex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(sigHex)) return null;

  let payload: string;
  try {
    payload = atob(encodedPayload);
  } catch {
    return null;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    toSecretBytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const sigPairs = sigHex.match(/.{2}/g);
  if (!sigPairs) return null;

  const sigBytes = new Uint8Array(sigPairs.map((pair) => Number.parseInt(pair, 16)));
  const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payload));
  if (!valid) return null;

  let parsed: UserSessionTokenPayload;
  try {
    parsed = JSON.parse(payload) as UserSessionTokenPayload;
  } catch {
    return null;
  }

  if (!Number.isInteger(parsed.userId) || parsed.userId < 1) return null;
  if (parsed.role !== "visitor" && parsed.role !== "member" && parsed.role !== "admin") return null;
  if (!Number.isInteger(parsed.exp) || Date.now() > parsed.exp) return null;

  return parsed;
}

export async function signUserSessionToken(
  payload: UserSessionTokenPayload,
  secret: string,
): Promise<string> {
  return sign(JSON.stringify(payload), secret);
}

export async function verifyUserSessionToken(
  token: string,
  secret: string,
): Promise<UserSessionTokenPayload | null> {
  return verify(token, secret);
}

export async function createUserSession(input: { userId: number; role: UserSessionRole }) {
  const secret = getSessionSecretOrThrow();
  const token = await signUserSessionToken(
    {
      userId: input.userId,
      role: input.role,
      exp: Date.now() + USER_SESSION_MAX_AGE * 1000,
    },
    secret,
  );

  const jar = await cookies();
  jar.set(USER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: USER_SESSION_MAX_AGE,
  });
}

export async function destroyUserSession() {
  const jar = await cookies();
  jar.delete(USER_SESSION_COOKIE);
}

export async function getUserSession(): Promise<UserSession | null> {
  const token = (await cookies()).get(USER_SESSION_COOKIE)?.value;
  if (!token) return null;
  const secret = getSessionSecretOrThrow();
  const payload = await verifyUserSessionToken(token, secret);
  if (!payload) return null;
  return {
    userId: payload.userId,
    role: payload.role,
  };
}
