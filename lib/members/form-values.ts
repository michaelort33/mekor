import type { ProfileVisibility } from "@/lib/members/types";

export type MemberProfileFormValues = {
  slug: string;
  fullName: string;
  avatarUrl: string;
  bio: string;
  interests: string[];
  city: string;
  email: string;
  phone: string;
  visibility: ProfileVisibility;
};
