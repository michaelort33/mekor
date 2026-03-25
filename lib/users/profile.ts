import { isVisibleToMembers, isVisibleToPublic, type ProfileVisibility } from "@/lib/users/visibility";

export const PROFILE_FIELD_KEYS = [
  "displayName",
  "bio",
  "city",
  "avatarUrl",
  "school",
  "occupation",
  "interests",
  "hobbies",
  "funFacts",
] as const;

export type ProfileFieldKey = (typeof PROFILE_FIELD_KEYS)[number];
export type ProfileFieldVisibilityValue = "public" | "private";

export type UserProfileDetails = {
  school: string;
  occupation: string;
  interests: string;
  hobbies: string;
  funFacts: string;
};

export type UserProfileFieldVisibility = Partial<Record<ProfileFieldKey, ProfileFieldVisibilityValue>>;

export const DEFAULT_PROFILE_DETAILS: UserProfileDetails = {
  school: "",
  occupation: "",
  interests: "",
  hobbies: "",
  funFacts: "",
};

export const DEFAULT_PROFILE_FIELD_VISIBILITY: Record<ProfileFieldKey, ProfileFieldVisibilityValue> = {
  displayName: "public",
  bio: "public",
  city: "public",
  avatarUrl: "public",
  school: "private",
  occupation: "private",
  interests: "private",
  hobbies: "private",
  funFacts: "private",
};

export function normalizeProfileDetails(value: Partial<UserProfileDetails> | null | undefined): UserProfileDetails {
  return {
    school: value?.school?.trim() ?? "",
    occupation: value?.occupation?.trim() ?? "",
    interests: value?.interests?.trim() ?? "",
    hobbies: value?.hobbies?.trim() ?? "",
    funFacts: value?.funFacts?.trim() ?? "",
  };
}

export function normalizeProfileFieldVisibility(
  value: UserProfileFieldVisibility | null | undefined,
): Record<ProfileFieldKey, ProfileFieldVisibilityValue> {
  return {
    displayName: value?.displayName ?? DEFAULT_PROFILE_FIELD_VISIBILITY.displayName,
    bio: value?.bio ?? DEFAULT_PROFILE_FIELD_VISIBILITY.bio,
    city: value?.city ?? DEFAULT_PROFILE_FIELD_VISIBILITY.city,
    avatarUrl: value?.avatarUrl ?? DEFAULT_PROFILE_FIELD_VISIBILITY.avatarUrl,
    school: value?.school ?? DEFAULT_PROFILE_FIELD_VISIBILITY.school,
    occupation: value?.occupation ?? DEFAULT_PROFILE_FIELD_VISIBILITY.occupation,
    interests: value?.interests ?? DEFAULT_PROFILE_FIELD_VISIBILITY.interests,
    hobbies: value?.hobbies ?? DEFAULT_PROFILE_FIELD_VISIBILITY.hobbies,
    funFacts: value?.funFacts ?? DEFAULT_PROFILE_FIELD_VISIBILITY.funFacts,
  };
}

export function isProfileFieldVisible(input: {
  profileVisibility: ProfileVisibility;
  fieldVisibility: ProfileFieldVisibilityValue;
  audience: "members" | "public";
}) {
  if (input.fieldVisibility !== "public") {
    return false;
  }

  return input.audience === "members"
    ? isVisibleToMembers(input.profileVisibility)
    : isVisibleToPublic(input.profileVisibility);
}

export function getVisibleProfileValue(input: {
  value: string;
  profileVisibility: ProfileVisibility;
  fieldVisibility: ProfileFieldVisibilityValue;
  audience: "members" | "public";
}) {
  const normalized = input.value.trim();
  if (!normalized) {
    return "";
  }

  return isProfileFieldVisible(input) ? normalized : "";
}
