import type { users } from "@/db/schema";
import {
  isDirectoryEligibleRole,
  isVisibleToMembers,
  isVisibleToPublic,
} from "@/lib/users/visibility";

type UserRow = typeof users.$inferSelect;

export function isVisibleInMembersDirectory(user: Pick<UserRow, "role" | "profileVisibility">) {
  return isDirectoryEligibleRole(user.role) && isVisibleToMembers(user.profileVisibility);
}

export function isVisibleInPublicDirectory(user: Pick<UserRow, "role" | "profileVisibility">) {
  return isDirectoryEligibleRole(user.role) && isVisibleToPublic(user.profileVisibility);
}

export function filterMembersDirectoryUsers<T extends Pick<UserRow, "role" | "profileVisibility">>(
  users: T[],
) {
  return users.filter((user) => isVisibleInMembersDirectory(user));
}

export function filterPublicDirectoryUsers<T extends Pick<UserRow, "role" | "profileVisibility">>(
  users: T[],
) {
  return users.filter((user) => isVisibleInPublicDirectory(user));
}
