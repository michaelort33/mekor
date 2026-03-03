import { NextResponse, type NextRequest } from "next/server";

import statusOverrides from "@/mirror-data/routes/status-overrides.json";

const STATUS_MAP = new Map<string, number>(
  (statusOverrides as Array<{ path: string; status: number }>).map((record) => [record.path, record.status]),
);

const ADMIN_SESSION_COOKIE = "mekor_admin_session";
const USER_SESSION_COOKIE = "mekor_user_session";

function getSecret(secretValue: string | undefined) {
  if (!secretValue) return null;
  return toArrayBuffer(new TextEncoder().encode(secretValue.padEnd(32, "0").slice(0, 32)));
}

function toArrayBuffer(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
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

async function hasValidAdminSession(token: string) {
  const secret = getSecret(process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD);
  if (!secret) return false;

  const parsed = await verifyToken(token, secret);
  if (!parsed) return false;

  const role = parsed.role;
  const exp = parsed.exp;
  if (typeof exp === "number" && Date.now() > exp) return false;
  return role === "admin";
}

async function hasValidUserSession(token: string) {
  const secret = getSecret(process.env.USER_SESSION_SECRET);
  if (!secret) return false;

  const parsed = await verifyToken(token, secret);
  if (!parsed) return false;

  const userId = parsed.userId;
  const role = parsed.role;
  const exp = parsed.exp;
  if (!Number.isInteger(userId) || Number(userId) < 1) return false;
  if (role !== "visitor" && role !== "member" && role !== "admin") return false;
  if (typeof exp !== "number" || Date.now() > exp) return false;
  return true;
}

function buildUserLoginRedirect(request: NextRequest) {
  const nextValue = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", nextValue);
  return loginUrl;
}

function unauthorizedResponse(
  request: NextRequest,
  options: {
    type: "admin" | "user";
    api: boolean;
    clearCookie?: boolean;
  },
) {
  const response = options.api
    ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    : options.type === "admin"
      ? NextResponse.redirect(new URL("/admin/login", request.url))
      : NextResponse.redirect(buildUserLoginRedirect(request));

  if (options.clearCookie) {
    response.cookies.delete(options.type === "admin" ? ADMIN_SESSION_COOKIE : USER_SESSION_COOKIE);
  }

  return response;
}

function resolveStatusOverride(request: NextRequest) {
  const pathWithQuery = `${request.nextUrl.pathname}${request.nextUrl.search || ""}`;
  const status = STATUS_MAP.get(pathWithQuery) ?? STATUS_MAP.get(request.nextUrl.pathname);

  if (status === 400) {
    return new NextResponse("Bad Request", {
      status: 400,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const statusOverride = resolveStatusOverride(request);
  if (statusOverride) {
    return statusOverride;
  }

  const { pathname } = request.nextUrl;
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  const isUserProtectedPage = pathname.startsWith("/account") || pathname.startsWith("/members");
  const isUserProtectedApi = pathname.startsWith("/api/account");

  if (!isAdminPage && !isAdminApi && !isUserProtectedPage && !isUserProtectedApi) {
    return NextResponse.next();
  }

  if (isAdminPage || isAdminApi) {
    if (pathname === "/admin/login" || pathname === "/api/admin/login") {
      return NextResponse.next();
    }

    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!token) {
      return unauthorizedResponse(request, {
        type: "admin",
        api: isAdminApi,
      });
    }

    const valid = await hasValidAdminSession(token);
    if (!valid) {
      return unauthorizedResponse(request, {
        type: "admin",
        api: isAdminApi,
        clearCookie: true,
      });
    }

    return NextResponse.next();
  }

  const token = request.cookies.get(USER_SESSION_COOKIE)?.value;
  if (!token) {
    return unauthorizedResponse(request, {
      type: "user",
      api: isUserProtectedApi,
    });
  }

  const valid = await hasValidUserSession(token);
  if (!valid) {
    return unauthorizedResponse(request, {
      type: "user",
      api: isUserProtectedApi,
      clearCookie: true,
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
