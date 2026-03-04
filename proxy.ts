import { NextResponse, type NextRequest } from "next/server";

import { getEdgeProtectionType, isAdminLoginPath, isApiPath } from "@/lib/auth/edge-route-policy";
import { USER_SESSION_COOKIE, getValidUserSessionRole, hasValidUserSession } from "@/lib/auth/edge-session";
import statusOverrides from "@/mirror-data/routes/status-overrides.json";

const STATUS_MAP = new Map<string, number>(
  (statusOverrides as Array<{ path: string; status: number }>).map((record) => [record.path, record.status]),
);

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
    isApi: boolean;
    clearCookie?: boolean;
  },
) {
  const response = options.isApi
    ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    : NextResponse.redirect(buildUserLoginRedirect(request));

  if (options.clearCookie) {
    response.cookies.delete(USER_SESSION_COOKIE);
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
  const protectionType = getEdgeProtectionType(pathname);
  if (protectionType === "none") {
    return NextResponse.next();
  }

  if (protectionType === "admin") {
    if (isAdminLoginPath(pathname)) {
      return NextResponse.next();
    }

    const token = request.cookies.get(USER_SESSION_COOKIE)?.value;
    if (!token) {
      return unauthorizedResponse(request, {
        type: "admin",
        isApi: isApiPath(pathname),
      });
    }

    const role = await getValidUserSessionRole(token);
    if (!role) {
      return unauthorizedResponse(request, {
        type: "admin",
        isApi: isApiPath(pathname),
        clearCookie: true,
      });
    }
    if (role !== "admin" && role !== "super_admin") {
      return unauthorizedResponse(request, {
        type: "admin",
        isApi: isApiPath(pathname),
      });
    }

    return NextResponse.next();
  }

  const token = request.cookies.get(USER_SESSION_COOKIE)?.value;
  if (!token) {
    return unauthorizedResponse(request, {
      type: "user",
      isApi: isApiPath(pathname),
    });
  }

  const valid = await hasValidUserSession(token);
  if (!valid) {
    return unauthorizedResponse(request, {
      type: "user",
      isApi: isApiPath(pathname),
      clearCookie: true,
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
