import { normalizePath } from "@/lib/native-content/content-loader";
import { PROFILE_VISIBILITY_CONFIG } from "@/lib/profile-visibility/config";
import type { ProfileAudience, ProfileVisibilityConfigEntry } from "@/lib/profile-visibility/types";

const DEFAULT_PROFILE_VISIBILITY: ProfileVisibilityConfigEntry = {
  visibility: "private",
};

export function normalizeProfilePolicyPath(pathValue: string) {
  const normalizedPath = normalizePath(pathValue);
  const [pathname = "/"] = normalizedPath.split("?");
  return normalizePath(pathname);
}

export function getProfileVisibility(pathValue: string): ProfileVisibilityConfigEntry {
  const policyPath = normalizeProfilePolicyPath(pathValue);
  return PROFILE_VISIBILITY_CONFIG[policyPath] ?? DEFAULT_PROFILE_VISIBILITY;
}

export function canViewProfile(pathValue: string, audience: ProfileAudience): boolean {
  const { visibility } = getProfileVisibility(pathValue);

  switch (visibility) {
    case "public":
      return true;
    case "members_only":
      return audience === "member";
    case "private":
    case "anonymous":
      return false;
    default:
      return false;
  }
}

export function isProfileSearchVisible(pathValue: string, audience: ProfileAudience): boolean {
  const { visibility } = getProfileVisibility(pathValue);
  if (visibility === "anonymous") {
    return false;
  }

  return canViewProfile(pathValue, audience);
}
