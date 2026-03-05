export const MESSAGE_SEGMENTS = [
  "all_people",
  "prospects",
  "invited_not_accepted",
  "active_members",
  "members_overdue",
] as const;

export type MessageSegmentKey = (typeof MESSAGE_SEGMENTS)[number];

export const MESSAGE_SEGMENT_LABELS: Record<MessageSegmentKey, string> = {
  all_people: "All people",
  prospects: "Prospects (leads)",
  invited_not_accepted: "Invited, not onboarded",
  active_members: "Active members/admins",
  members_overdue: "Members with overdue/open dues",
};
