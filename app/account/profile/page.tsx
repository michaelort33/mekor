"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { MemberShell } from "@/components/members/member-shell";
import memberShellStyles from "@/components/members/member-shell.module.css";
import styles from "./page.module.css";

type ProfileFieldVisibility = "public" | "private";
type ProfileVisibility = "private" | "members" | "public" | "anonymous";

type ProfileDetails = {
  school: string;
  occupation: string;
  interests: string;
  hobbies: string;
  funFacts: string;
};

type ProfileFieldVisibilityMap = {
  displayName: ProfileFieldVisibility;
  bio: ProfileFieldVisibility;
  city: ProfileFieldVisibility;
  avatarUrl: ProfileFieldVisibility;
  school: ProfileFieldVisibility;
  occupation: ProfileFieldVisibility;
  interests: ProfileFieldVisibility;
  hobbies: ProfileFieldVisibility;
  funFacts: ProfileFieldVisibility;
};

type ProfileResponse = {
  profile: {
    id: number;
    email: string;
    displayName: string;
    bio: string;
    city: string;
    avatarUrl: string;
    profileDetails: ProfileDetails;
    profileFieldVisibility: ProfileFieldVisibilityMap;
    profileVisibility: ProfileVisibility;
    role: "visitor" | "member" | "admin" | "super_admin";
    accessState: "approved_member" | "pending_approval" | "declined" | "visitor";
    canAccessMembersArea: boolean;
    latestMembershipApplicationStatus: "pending" | "approved" | "declined" | null;
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
    profileDetails: {
      school: "",
      occupation: "",
      interests: "",
      hobbies: "",
      funFacts: "",
    },
    profileFieldVisibility: {
      displayName: "public" as ProfileFieldVisibility,
      bio: "public" as ProfileFieldVisibility,
      city: "public" as ProfileFieldVisibility,
      avatarUrl: "public" as ProfileFieldVisibility,
      school: "private" as ProfileFieldVisibility,
      occupation: "private" as ProfileFieldVisibility,
      interests: "private" as ProfileFieldVisibility,
      hobbies: "private" as ProfileFieldVisibility,
      funFacts: "private" as ProfileFieldVisibility,
    },
    profileVisibility: "private" as ProfileVisibility,
    accessState: "visitor" as "approved_member" | "pending_approval" | "declined" | "visitor",
    canAccessMembersArea: false,
  });
  const [memberStats, setMemberStats] = useState<{
    eventsHostedCount: number;
    approvedAttendeesTotal: number;
    uniqueAttendeesCount: number;
    upcomingHostedCount: number;
    attendanceRate: number;
  } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const [response, statsResponse] = await Promise.all([
        fetch("/api/account/profile"),
        fetch("/api/account/member-stats"),
      ]);
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
        profileDetails: data.profile.profileDetails,
        profileFieldVisibility: data.profile.profileFieldVisibility,
        profileVisibility: data.profile.profileVisibility,
        accessState: data.profile.accessState,
        canAccessMembersArea: data.profile.canAccessMembersArea,
      });
      if (statsResponse.ok) {
        const statsPayload = (await statsResponse.json().catch(() => ({}))) as {
          stats?: {
            eventsHostedCount: number;
            approvedAttendeesTotal: number;
            uniqueAttendeesCount: number;
            upcomingHostedCount: number;
            attendanceRate: number;
          };
        };
        setMemberStats(statsPayload.stats ?? null);
      }
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

  function updateDetail(field: keyof ProfileDetails, value: string) {
    setForm((prev) => ({
      ...prev,
      profileDetails: {
        ...prev.profileDetails,
        [field]: value,
      },
    }));
  }

  function updateFieldVisibility(field: keyof ProfileFieldVisibilityMap, value: ProfileFieldVisibility) {
    setForm((prev) => ({
      ...prev,
      profileFieldVisibility: {
        ...prev.profileFieldVisibility,
        [field]: value,
      },
    }));
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
        profileDetails: form.profileDetails,
        profileFieldVisibility: form.profileFieldVisibility,
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
    window.location.assign("/");
  }

  if (loading) {
    return <main className={`${styles.page} internal-page`}>Loading profile...</main>;
  }

  const shellStats = [
    { label: "Role", value: form.role, hint: "Account permission level" },
    {
      label: "Membership access",
      value: form.canAccessMembersArea ? "approved" : form.accessState.replace("_", " "),
      hint: form.canAccessMembersArea ? "Full member features are unlocked" : "Member tools unlock after approval",
    },
    memberStats
      ? {
          label: "Hosted events",
          value: String(memberStats.eventsHostedCount),
          hint: `${memberStats.approvedAttendeesTotal} approved attendees total`,
        }
      : {
          label: "Hosted events",
          value: "0",
          hint: "No member stats yet",
        },
  ];

  const visibilityHint =
    form.profileVisibility === "private"
      ? "Your profile is hidden everywhere, so individual field toggles are currently inactive."
      : form.profileVisibility === "members"
        ? "Fields marked public will be visible to approved members only."
        : form.profileVisibility === "public"
          ? "Fields marked public will appear in both the public directory and the members area."
          : "Anonymous mode hides your identity even when individual fields are marked public.";

  return (
    <MemberShell
      title="Your profile"
      description={
        form.canAccessMembersArea
          ? "Edit your public details and choose who can see your profile."
          : "Edit your basic profile while your membership access is being reviewed."
      }
      eyebrow={form.canAccessMembersArea ? "Members Area" : "Account"}
      breadcrumbs={[
        { label: "Home", href: "/" },
        form.canAccessMembersArea
          ? { label: "Members Area", href: "/members" }
          : { label: "Account", href: "/account" },
        { label: "Your Profile" },
      ]}
      activeSection="profile"
      navigationContext={form.canAccessMembersArea ? "member" : "authenticated"}
      stats={shellStats}
      actions={
        <>
          {form.canAccessMembersArea ? <Link href="/members" className={memberShellStyles.actionPill}>Members directory</Link> : null}
          <button type="button" className={memberShellStyles.secondaryButton} onClick={logout}>
            Log out
          </button>
        </>
      }
    >

      <form className={`${styles.card} internal-card`} onSubmit={saveProfile}>
        <div className={`${styles.header} internal-header`}>
          <h1>Your profile</h1>
        </div>

        <p className={styles.subtitle}>
          {form.canAccessMembersArea
            ? "Edit your public details and choose who can see your profile."
            : form.accessState === "pending_approval"
              ? "Your account is pending member approval. You can still update your profile now so it is ready once access is granted."
              : form.accessState === "declined"
                ? "Your last membership application was declined. You can still keep your basic profile information current."
                : "Edit your basic account profile."}
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
          <div className={styles.fieldRow}>
            <input
              type="text"
              value={form.displayName}
              onChange={(event) => update("displayName", event.target.value)}
              required
              minLength={2}
              maxLength={120}
            />
            <select
              value={form.profileFieldVisibility.displayName}
              onChange={(event) => updateFieldVisibility("displayName", event.target.value as ProfileFieldVisibility)}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
        </label>

        <label className={styles.field}>
          <span>Short bio</span>
          <div className={styles.fieldRow}>
            <textarea
              value={form.bio}
              onChange={(event) => update("bio", event.target.value)}
              maxLength={500}
              rows={4}
            />
            <select
              value={form.profileFieldVisibility.bio}
              onChange={(event) => updateFieldVisibility("bio", event.target.value as ProfileFieldVisibility)}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
        </label>

        <label className={styles.field}>
          <span>City</span>
          <div className={styles.fieldRow}>
            <input
              type="text"
              value={form.city}
              onChange={(event) => update("city", event.target.value)}
              maxLength={120}
            />
            <select
              value={form.profileFieldVisibility.city}
              onChange={(event) => updateFieldVisibility("city", event.target.value as ProfileFieldVisibility)}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
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
            <div className={styles.fieldRow}>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarUpload} disabled={uploadingAvatar || generatingAvatar} />
              <select
                value={form.profileFieldVisibility.avatarUrl}
                onChange={(event) => updateFieldVisibility("avatarUrl", event.target.value as ProfileFieldVisibility)}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
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

        <p className={styles.visibilityHint}>{visibilityHint}</p>

        <section className={styles.avatarSection}>
          <h2>Optional profile details</h2>
          <p className={styles.avatarHint}>Add the kind of context you might share on a host profile, then decide whether each field is public or private.</p>

          <label className={styles.field}>
            <span>School</span>
            <div className={styles.fieldRow}>
              <input
                type="text"
                value={form.profileDetails.school}
                onChange={(event) => updateDetail("school", event.target.value)}
                maxLength={160}
              />
              <select
                value={form.profileFieldVisibility.school}
                onChange={(event) => updateFieldVisibility("school", event.target.value as ProfileFieldVisibility)}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </label>

          <label className={styles.field}>
            <span>Occupation</span>
            <div className={styles.fieldRow}>
              <input
                type="text"
                value={form.profileDetails.occupation}
                onChange={(event) => updateDetail("occupation", event.target.value)}
                maxLength={160}
              />
              <select
                value={form.profileFieldVisibility.occupation}
                onChange={(event) => updateFieldVisibility("occupation", event.target.value as ProfileFieldVisibility)}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </label>

          <label className={styles.field}>
            <span>Interests</span>
            <div className={styles.fieldRow}>
              <textarea
                value={form.profileDetails.interests}
                onChange={(event) => updateDetail("interests", event.target.value)}
                maxLength={500}
                rows={3}
              />
              <select
                value={form.profileFieldVisibility.interests}
                onChange={(event) => updateFieldVisibility("interests", event.target.value as ProfileFieldVisibility)}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </label>

          <label className={styles.field}>
            <span>Hobbies</span>
            <div className={styles.fieldRow}>
              <textarea
                value={form.profileDetails.hobbies}
                onChange={(event) => updateDetail("hobbies", event.target.value)}
                maxLength={500}
                rows={3}
              />
              <select
                value={form.profileFieldVisibility.hobbies}
                onChange={(event) => updateFieldVisibility("hobbies", event.target.value as ProfileFieldVisibility)}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </label>

          <label className={styles.field}>
            <span>Fun facts</span>
            <div className={styles.fieldRow}>
              <textarea
                value={form.profileDetails.funFacts}
                onChange={(event) => updateDetail("funFacts", event.target.value)}
                maxLength={500}
                rows={3}
              />
              <select
                value={form.profileFieldVisibility.funFacts}
                onChange={(event) => updateFieldVisibility("funFacts", event.target.value as ProfileFieldVisibility)}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </label>
        </section>

        {memberStats ? (
          <section className={styles.avatarSection}>
            <h2>Host stats</h2>
            <p className={styles.avatarHint}>
              Events hosted: {memberStats.eventsHostedCount} · Upcoming hosted: {memberStats.upcomingHostedCount}
            </p>
            <p className={styles.avatarHint}>
              Approved attendees: {memberStats.approvedAttendeesTotal} · Unique attendees: {memberStats.uniqueAttendeesCount}
            </p>
          </section>
        ) : null}

        <div className={`${styles.actions} internal-actions`}>
          <button className={styles.button} type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save profile"}
          </button>
          <Link href={form.canAccessMembersArea ? "/members" : "/account"} className={styles.secondaryLink}>
            {form.canAccessMembersArea ? "View members area" : "Open account home"}
          </Link>
          {form.canAccessMembersArea ? (
            <>
              <Link href="/account/dues" className={styles.secondaryLink}>
                View dues
              </Link>
              <Link href="/account/member-events" className={styles.secondaryLink}>
                Host events
              </Link>
            </>
          ) : null}
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}
        {notice ? <p className={styles.notice}>{notice}</p> : null}
      </form>
    </MemberShell>
  );
}
