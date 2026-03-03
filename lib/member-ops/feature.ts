export function isMemberOpsEnabled() {
  return process.env.MEMBER_OPS_ENABLED === "1";
}

export function assertMemberOpsEnabled() {
  if (!isMemberOpsEnabled()) {
    throw new Error("MEMBER_OPS_ENABLED is required for member operations endpoints");
  }
}
