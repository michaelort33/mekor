export const ADMIN_SESSION_COOKIE = "mekor_admin_session";
export const USER_SESSION_COOKIE = "mekor_user_session";

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
