export type PersonStatus = "lead" | "invited" | "visitor" | "guest" | "member" | "admin" | "super_admin" | "inactive";
export type UserRole = "visitor" | "member" | "admin" | "super_admin";

export function userRoleToPersonStatus(role: UserRole): PersonStatus {
  if (role === "visitor") return "visitor";
  if (role === "member") return "member";
  if (role === "admin") return "admin";
  return "super_admin";
}
