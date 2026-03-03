import { cookies } from "next/headers";

const SESSION_COOKIE = "mekor_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "dev-fallback-secret";
  return new TextEncoder().encode(secret.padEnd(32, "0").slice(0, 32));
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", getSecret(), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const sigHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${btoa(payload)}.${sigHex}`;
}

async function verify(token: string): Promise<string | null> {
  const [encodedPayload, sigHex] = token.split(".");
  if (!encodedPayload || !sigHex) return null;

  const payload = atob(encodedPayload);
  const key = await crypto.subtle.importKey("raw", getSecret(), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payload));

  if (!valid) return null;

  const data = JSON.parse(payload);
  if (data.exp && Date.now() > data.exp) return null;

  return data.role ?? null;
}

export async function createAdminSession() {
  const payload = JSON.stringify({ role: "admin", exp: Date.now() + SESSION_MAX_AGE * 1000 });
  const token = await sign(payload);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroyAdminSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getAdminSession(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const role = await verify(token);
  return role === "admin";
}

export function verifyAdminPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  return password === adminPassword;
}
