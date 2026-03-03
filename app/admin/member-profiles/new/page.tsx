"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { MemberProfileForm } from "@/components/admin/member-profile-form";
import type { MemberProfileFormValues } from "@/lib/members/form-values";
import styles from "../form-page.module.css";

const INITIAL_VALUES: MemberProfileFormValues = {
  slug: "",
  fullName: "",
  avatarUrl: "",
  bio: "",
  interests: [],
  city: "",
  email: "",
  phone: "",
  visibility: "private",
};

export default function NewMemberProfilePage() {
  const router = useRouter();

  async function handleSubmit(values: MemberProfileFormValues) {
    const response = await fetch("/api/admin/member-profiles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error || "Could not create profile.");
    }

    router.push("/admin/member-profiles");
    router.refresh();
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/admin/member-profiles" className={styles.backLink}>
          ← Back to member profiles
        </Link>
      </div>

      <MemberProfileForm
        title="New Member Profile"
        submitLabel="Create Profile"
        initialValues={INITIAL_VALUES}
        onSubmit={handleSubmit}
        allowSlugEdit
      />
    </div>
  );
}
