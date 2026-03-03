import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "mekor_admin_session";

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "dev-fallback-secret";
  return new TextEncoder().encode(secret.padEnd(32, "0").slice(0, 32));
}

async function verifyToken(token: string): Promise<boolean> {
  const [encodedPayload, sigHex] = token.split(".");
  if (!encodedPayload || !sigHex) return false;

  const payload = atob(encodedPayload);
  const key = await crypto.subtle.importKey("raw", getSecret(), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const valid = await crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payload));

  if (!valid) return false;

  const data = JSON.parse(payload);
  if (data.exp && Date.now() > data.exp) return false;

  return data.role === "admin";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  const isAdminRoute = isAdminPage || isAdminApi;

  if (!isAdminRoute) {
    return NextResponse.next();
  }

  if (pathname === "/admin/login" || pathname === "/api/admin/login" || pathname === "/api/admin/logout") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    if (isAdminApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const valid = await verifyToken(token);

  if (!valid) {
    const response = isAdminApi
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      : NextResponse.redirect(new URL("/admin/login", request.url));
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
