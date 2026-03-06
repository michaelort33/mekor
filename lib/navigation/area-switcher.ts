import type { UserSessionRole } from "@/lib/auth/session";
import { normalizeNavigationPath } from "@/lib/navigation/path";

export type AppArea = "site" | "member" | "admin";

export type AreaSwitcherLink = {
  area: AppArea;
  href: string;
  label: string;
  current: boolean;
  requiresSignIn: boolean;
};

function isMemberCapableRole(role: UserSessionRole | null) {
  return role === "member" || role === "admin" || role === "super_admin";
}

function isAdminLevelRole(role: UserSessionRole | null) {
  return role === "admin" || role === "super_admin";
}

export function detectAppArea(currentPath: string): AppArea {
  const normalizedPath = normalizeNavigationPath(currentPath);

  if (normalizedPath === "/admin" || normalizedPath.startsWith("/admin/")) {
    return "admin";
  }

  if (
    normalizedPath === "/account" ||
    normalizedPath.startsWith("/account/") ||
    normalizedPath === "/members" ||
    normalizedPath.startsWith("/members/") ||
    normalizedPath === "/member-events" ||
    normalizedPath.startsWith("/member-events/")
  ) {
    return "member";
  }

  return "site";
}

export function buildAreaSwitcherLinks(input: {
  currentPath: string;
  role: UserSessionRole | null;
  includeSignInLinks?: boolean;
  currentArea?: AppArea;
}): AreaSwitcherLink[] {
  const currentArea = input.currentArea ?? detectAppArea(input.currentPath);
  const links: AreaSwitcherLink[] = [
    {
      area: "site",
      href: "/",
      label: "Public Site",
      current: currentArea === "site",
      requiresSignIn: false,
    },
  ];

  if (isMemberCapableRole(input.role)) {
    links.push({
      area: "member",
      href: "/account",
      label: "Member Area",
      current: currentArea === "member",
      requiresSignIn: false,
    });
  } else if (input.includeSignInLinks) {
    links.push({
      area: "member",
      href: "/login?next=%2Faccount",
      label: "Member Sign In",
      current: currentArea === "member",
      requiresSignIn: true,
    });
  }

  if (isAdminLevelRole(input.role)) {
    links.push({
      area: "admin",
      href: "/admin",
      label: "Admin",
      current: currentArea === "admin",
      requiresSignIn: false,
    });
  } else if (input.includeSignInLinks) {
    links.push({
      area: "admin",
      href: "/login?next=%2Fadmin",
      label: "Admin Sign In",
      current: currentArea === "admin",
      requiresSignIn: true,
    });
  }

  return links;
}
