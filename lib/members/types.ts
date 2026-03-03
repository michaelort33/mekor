export type ProfileVisibility = "private" | "members_only" | "public" | "anonymous";

export type ViewerAccessContext = {
  isMember: boolean;
};

export type MemberProfileRecord = {
  id: number;
  slug: string;
  fullName: string;
  avatarUrl: string;
  bio: string;
  interests: string[];
  city: string;
  email: string;
  phone: string;
  visibility: ProfileVisibility;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicMemberProfileCard = {
  slug: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  interests: string[];
  city: string | null;
  email: string | null;
  phone: string | null;
  isAnonymous: boolean;
};

export type PublicMemberProfileDetail = PublicMemberProfileCard;
