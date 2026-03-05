export type EdgeProtectionType = "none" | "user" | "admin";

const PUBLIC_EXACT_PATHS = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/membership",
  "/invite/accept",
]);

const PUBLIC_PREFIX_PATHS = ["/community"];
const USER_PAGE_PREFIX_PATHS = ["/account", "/members"];
const USER_API_PREFIX_PATHS = ["/api/account", "/api/families", "/api/inbox"];
const USER_API_PATTERNS = [
  /^\/api\/events\/[^/]+\/signup$/,
  /^\/api\/events\/[^/]+\/checkout$/,
  /^\/api\/events\/[^/]+\/cancel$/,
  /^\/api\/events\/[^/]+\/ask-organizer$/,
  /^\/api\/member-events\/[^/]+\/join$/,
  /^\/api\/member-events\/[^/]+\/cancel$/,
  /^\/api\/member-events\/[^/]+\/requests\/[^/]+\/approve$/,
  /^\/api\/member-events\/[^/]+\/requests\/[^/]+\/reject$/,
];

const ADMIN_PAGE_PREFIX = "/admin";
const ADMIN_API_PREFIX = "/api/admin";
const ADMIN_LOGIN_PATHS = new Set(["/admin/login", "/api/admin/login"]);

export function matchesPathPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isExplicitlyPublicPath(pathname: string) {
  if (PUBLIC_EXACT_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIX_PATHS.some((prefix) => matchesPathPrefix(pathname, prefix));
}

export function isAdminLoginPath(pathname: string) {
  return ADMIN_LOGIN_PATHS.has(pathname);
}

export function getEdgeProtectionType(pathname: string): EdgeProtectionType {
  if (isExplicitlyPublicPath(pathname)) {
    return "none";
  }

  if (matchesPathPrefix(pathname, ADMIN_PAGE_PREFIX) || pathname.startsWith(ADMIN_API_PREFIX)) {
    return "admin";
  }

  if (USER_PAGE_PREFIX_PATHS.some((prefix) => matchesPathPrefix(pathname, prefix))) {
    return "user";
  }

  if (USER_API_PREFIX_PATHS.some((prefix) => pathname.startsWith(prefix))) {
    return "user";
  }

  if (USER_API_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return "user";
  }

  return "none";
}

export function isApiPath(pathname: string) {
  return pathname.startsWith("/api/");
}
