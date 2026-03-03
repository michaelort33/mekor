export type ProfileVisibility = "private" | "members_only" | "public" | "anonymous";

export type ProfileAudience = "public" | "member";

export type AnonymousDirectoryCard = {
  role?: string;
  neighborhood?: string;
};

export type ProfileVisibilityConfigEntry = {
  visibility: ProfileVisibility;
  anonymousCard?: AnonymousDirectoryCard;
};
