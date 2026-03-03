"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { MemberProfileForm } from "@/components/admin/member-profile-form";
import type { MemberProfileFormValues } from "@/lib/members/form-values";
import styles from "../../form-page.module.css";

type EditMemberProfileClientProps = {
  id: number;
  initialValues: MemberProfileFormValues;
};

export function EditMemberProfileClient({ id, initialValues }: EditMemberProfileClientProps) {
  const router = useRouter();

  async function handleSubmit(values: MemberProfileFormValues) {
    const response = await fetch("/api/admin/member-profiles", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...values }),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error || "Could not update profile.");
    }

    router.push("/admin/member-profiles");
    router.refresh();
  }

  async function handleDelete() {
    const confirmed = window.confirm("Delete this profile?");
    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/admin/member-profiles?id=${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      window.alert(payload.error || "Could not delete profile.");
      return;
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
        title="Edit Member Profile"
        submitLabel="Save Changes"
        initialValues={initialValues}
        onSubmit={handleSubmit}
        allowSlugEdit
      />

      <div className={styles.topBar}>
        <button
          type="button"
          onClick={handleDelete}
          style={{
            marginTop: "12px",
            minHeight: "40px",
            borderRadius: "10px",
            border: "1px solid #a64242",
            background: "#fff1f1",
            color: "#8f2222",
            fontWeight: 700,
            padding: "0 14px",
            cursor: "pointer",
          }}
        >
          Delete Profile
        </button>
      </div>
    </div>
  );
}
