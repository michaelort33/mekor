export type MemberEventJoinMode = "open_join" | "request_to_join";
export type MemberEventAttendeeStatus = "requested" | "approved" | "rejected" | "cancelled" | "waitlisted";

export function resolveMemberEventJoinStatus(input: {
  joinMode: MemberEventJoinMode;
  atCapacity: boolean;
}): MemberEventAttendeeStatus {
  if (input.atCapacity) {
    return "waitlisted";
  }
  if (input.joinMode === "open_join") {
    return "approved";
  }
  return "requested";
}

export function calculateAttendanceRate(input: {
  approvedAttendeesTotal: number;
  capacityTotal: number;
}) {
  if (input.capacityTotal <= 0) {
    return 0;
  }
  return Number((input.approvedAttendeesTotal / input.capacityTotal).toFixed(4));
}
