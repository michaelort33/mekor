import type { users } from "@/db/schema";

export type UserRole = typeof users.$inferSelect.role;
export type ProfileVisibility = typeof users.$inferSelect.profileVisibility;

export function isDirectoryEligibleRole(role: UserRole) {
  return role === "member" || role === "admin";
}

export function isVisibleToMembers(visibility: ProfileVisibility) {
  return visibility === "members" || visibility === "public" || visibility === "anonymous";
}

export function isVisibleToPublic(visibility: ProfileVisibility) {
  return visibility === "public" || visibility === "anonymous";
}

export function isAnonymousVisibility(visibility: ProfileVisibility) {
  return visibility === "anonymous";
}
