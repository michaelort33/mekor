import type {
  MemberProfileRecord,
  PublicMemberProfileDetail,
  ViewerAccessContext,
} from "@/lib/members/types";

export function isVisibleInPublicDirectory(
  profile: Pick<MemberProfileRecord, "visibility">,
  viewer: ViewerAccessContext,
): boolean {
  if (profile.visibility === "public" || profile.visibility === "anonymous") {
    return true;
  }

  if (profile.visibility === "members_only") {
    return viewer.isMember;
  }

  return false;
}

export function isVisibleOnPublicProfile(
  profile: Pick<MemberProfileRecord, "visibility">,
  viewer: ViewerAccessContext,
): boolean {
  return isVisibleInPublicDirectory(profile, viewer);
}

export function toPublicProfileView(
  profile: Pick<
    MemberProfileRecord,
    "slug" | "fullName" | "avatarUrl" | "bio" | "interests" | "city" | "email" | "phone" | "visibility"
  >,
): PublicMemberProfileDetail {
  if (profile.visibility === "anonymous") {
    return {
      slug: profile.slug,
      displayName: "Community Member",
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      interests: profile.interests,
      city: null,
      email: null,
      phone: null,
      isAnonymous: true,
    };
  }

  return {
    slug: profile.slug,
    displayName: profile.fullName,
    avatarUrl: profile.avatarUrl,
    bio: profile.bio,
    interests: profile.interests,
    city: profile.city,
    email: profile.email,
    phone: profile.phone,
    isAnonymous: false,
  };
}
