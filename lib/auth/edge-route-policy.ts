export type EdgeProtectionType = "none" | "authenticated" | "member" | "admin";

const PUBLIC_EXACT_PATHS = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/membership",
  "/membership/apply",
  "/invite/accept",
]);

const PUBLIC_PREFIX_PATHS = ["/community"];
const AUTHENTICATED_PAGE_EXACT_PATHS = new Set(["/account", "/account/profile"]);
const MEMBER_PAGE_PREFIX_PATHS = [
  "/members",
  "/account/dues",
  "/account/payments",
  "/account/family",
  "/account/inbox",
  "/account/member-events",
  "/member-events",
];
const AUTHENTICATED_API_EXACT_PATHS = new Set([
  "/api/account/avatar/generate",
  "/api/account/avatar/upload",
  "/api/account/dashboard",
  "/api/account/member-stats",
  "/api/account/profile",
]);
const MEMBER_API_PREFIX_PATHS = ["/api/account/dues", "/api/account/payments", "/api/account/stripe", "/api/families", "/api/inbox", "/api/member-events"];
const AUTHENTICATED_API_PATTERNS = [
  /^\/api\/events\/[^/]+\/signup$/,
  /^\/api\/events\/[^/]+\/checkout$/,
  /^\/api\/events\/[^/]+\/cancel$/,
  /^\/api\/events\/[^/]+\/ask-organizer$/,
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

  if (AUTHENTICATED_PAGE_EXACT_PATHS.has(pathname)) {
    return "authenticated";
  }

  if (MEMBER_PAGE_PREFIX_PATHS.some((prefix) => matchesPathPrefix(pathname, prefix))) {
    return "member";
  }

  if (AUTHENTICATED_API_EXACT_PATHS.has(pathname)) {
    return "authenticated";
  }

  if (MEMBER_API_PREFIX_PATHS.some((prefix) => matchesPathPrefix(pathname, prefix))) {
    return "member";
  }

  if (AUTHENTICATED_API_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return "authenticated";
  }

  return "none";
}

export function isApiPath(pathname: string) {
  return pathname.startsWith("/api/");
}
