import { notFound } from "next/navigation";

import { getMemberProfileByIdForAdmin } from "@/lib/members/store";
import type { MemberProfileFormValues } from "@/lib/members/form-values";
import { EditMemberProfileClient } from "./edit-member-profile-client";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

function toFormValues(profile: NonNullable<Awaited<ReturnType<typeof getMemberProfileByIdForAdmin>>>): MemberProfileFormValues {
  return {
    slug: profile.slug,
    fullName: profile.fullName,
    avatarUrl: profile.avatarUrl,
    bio: profile.bio,
    interests: profile.interests,
    city: profile.city,
    email: profile.email,
    phone: profile.phone,
    visibility: profile.visibility,
  };
}

export default async function EditMemberProfilePage({ params }: PageProps) {
  const { id } = await params;
  const profileId = Number(id);
  if (!Number.isFinite(profileId) || profileId <= 0) {
    notFound();
  }

  const profile = await getMemberProfileByIdForAdmin(profileId);
  if (!profile) {
    notFound();
  }

  return <EditMemberProfileClient id={profile.id} initialValues={toFormValues(profile)} />;
}
