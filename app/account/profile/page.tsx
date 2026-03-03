"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import styles from "./page.module.css";

type ProfileResponse = {
  profile: {
    id: number;
    email: string;
    displayName: string;
    bio: string;
    city: string;
    avatarUrl: string;
    profileVisibility: "private" | "members" | "public" | "anonymous";
    role: "visitor" | "member" | "admin";
  };
};

export default function AccountProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    email: "",
    role: "visitor" as "visitor" | "member" | "admin",
    displayName: "",
    bio: "",
    city: "",
    avatarUrl: "",
    profileVisibility: "private" as "private" | "members" | "public" | "anonymous",
  });

  useEffect(() => {
    async function loadProfile() {
      const response = await fetch("/api/account/profile");
      if (response.status === 401) {
        router.replace("/login?next=/account/profile");
        return;
      }

      const data = (await response.json()) as ProfileResponse;
      setForm({
        email: data.profile.email,
        role: data.profile.role,
        displayName: data.profile.displayName,
        bio: data.profile.bio,
        city: data.profile.city,
        avatarUrl: data.profile.avatarUrl,
        profileVisibility: data.profile.profileVisibility,
      });
      setLoading(false);
    }

    loadProfile().catch(() => {
      setError("Unable to load profile");
      setLoading(false);
    });
  }, [router]);

  function update(field: "displayName" | "bio" | "city" | "avatarUrl", value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);

    const response = await fetch("/api/account/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: form.displayName,
        bio: form.bio,
        city: form.city,
        avatarUrl: form.avatarUrl,
        profileVisibility: form.profileVisibility,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(data.error || "Unable to save profile");
      setSaving(false);
      return;
    }

    setNotice("Profile saved");
    setSaving(false);
    router.refresh();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return <main className={styles.page}>Loading profile...</main>;
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={saveProfile}>
        <div className={styles.header}>
          <h1>Your profile</h1>
          <button type="button" className={styles.secondaryButton} onClick={logout}>
            Log out
          </button>
        </div>

        <p className={styles.subtitle}>
          Edit your public details and choose who can see your profile.
        </p>

        <label className={styles.field}>
          <span>Email</span>
          <input type="email" value={form.email} readOnly />
        </label>

        <label className={styles.field}>
          <span>Role</span>
          <input type="text" value={form.role} readOnly />
        </label>

        <label className={styles.field}>
          <span>Display name</span>
          <input
            type="text"
            value={form.displayName}
            onChange={(event) => update("displayName", event.target.value)}
            required
            minLength={2}
            maxLength={120}
          />
        </label>

        <label className={styles.field}>
          <span>Short bio</span>
          <textarea
            value={form.bio}
            onChange={(event) => update("bio", event.target.value)}
            maxLength={500}
            rows={4}
          />
        </label>

        <label className={styles.field}>
          <span>City</span>
          <input
            type="text"
            value={form.city}
            onChange={(event) => update("city", event.target.value)}
            maxLength={120}
          />
        </label>

        <label className={styles.field}>
          <span>Avatar URL (optional)</span>
          <input
            type="url"
            value={form.avatarUrl}
            onChange={(event) => update("avatarUrl", event.target.value)}
            maxLength={2048}
            placeholder="https://..."
          />
        </label>

        <label className={styles.field}>
          <span>Directory visibility</span>
          <select
            value={form.profileVisibility}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                profileVisibility: event.target.value as "private" | "members" | "public" | "anonymous",
              }))
            }
          >
            <option value="private">Private</option>
            <option value="members">Members only</option>
            <option value="public">Public</option>
            <option value="anonymous">Anonymous</option>
          </select>
        </label>

        <div className={styles.actions}>
          <button className={styles.button} type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save profile"}
          </button>
          <Link href="/members" className={styles.secondaryLink}>
            View members area
          </Link>
          <Link href="/account/dues" className={styles.secondaryLink}>
            View dues
          </Link>
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}
        {notice ? <p className={styles.notice}>{notice}</p> : null}
      </form>
    </main>
  );
}
