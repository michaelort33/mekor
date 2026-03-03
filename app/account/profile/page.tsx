"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { MembersBreadcrumbs } from "@/components/members/members-breadcrumbs";
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
    role: "visitor" | "member" | "admin" | "super_admin";
  };
};

export default function AccountProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [avatarPrompt, setAvatarPrompt] = useState("");
  const [form, setForm] = useState({
    email: "",
    role: "visitor" as "visitor" | "member" | "admin" | "super_admin",
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

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError("");
    setNotice("");
    setUploadingAvatar(true);

    const data = new FormData();
    data.append("file", file);

    const response = await fetch("/api/account/avatar/upload", {
      method: "POST",
      body: data,
    });

    const body = (await response.json().catch(() => ({}))) as { error?: string; avatarUrl?: string };
    if (!response.ok || !body.avatarUrl) {
      setError(body.error || "Unable to upload avatar");
      setUploadingAvatar(false);
      return;
    }

    update("avatarUrl", body.avatarUrl);
    setNotice("Avatar uploaded");
    setUploadingAvatar(false);
    router.refresh();
  }

  async function generateAvatar() {
    setError("");
    setNotice("");
    setGeneratingAvatar(true);

    const response = await fetch("/api/account/avatar/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: avatarPrompt }),
    });

    const body = (await response.json().catch(() => ({}))) as { error?: string; avatarUrl?: string };
    if (!response.ok || !body.avatarUrl) {
      setError(body.error || "Unable to generate avatar");
      setGeneratingAvatar(false);
      return;
    }

    update("avatarUrl", body.avatarUrl);
    setNotice("Avatar generated");
    setGeneratingAvatar(false);
    router.refresh();
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
      <MembersBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Members Area", href: "/members" },
          { label: "Your Profile" },
        ]}
      />

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

        <section className={styles.avatarSection}>
          <h2>Avatar</h2>
          <p className={styles.avatarHint}>Upload a photo or generate a cartoon/anime avatar from a short description.</p>

          <div className={styles.avatarPreview}>
            {form.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.avatarUrl} alt="Your avatar preview" />
            ) : (
              <div className={styles.avatarPlaceholder}>{form.displayName.charAt(0).toUpperCase() || "M"}</div>
            )}
          </div>

          <label className={styles.field}>
            <span>Upload image (PNG, JPG, WEBP, max 5MB)</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarUpload} disabled={uploadingAvatar || generatingAvatar} />
          </label>

          <label className={styles.field}>
            <span>Generate with AI</span>
            <input
              type="text"
              value={avatarPrompt}
              onChange={(event) => setAvatarPrompt(event.target.value)}
              maxLength={180}
              placeholder="Example: friendly person with glasses and blue hoodie"
            />
          </label>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={generateAvatar}
            disabled={generatingAvatar || uploadingAvatar || avatarPrompt.trim().length < 3}
          >
            {generatingAvatar ? "Generating avatar..." : "Generate avatar"}
          </button>
        </section>

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
