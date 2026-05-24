"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AccountShell } from "@/components/account/account-shell";
import { Button } from "@/components/backend/ui/button";
import { Card, CardBody, CardHeader } from "@/components/backend/ui/card";
import { DataState } from "@/components/backend/data/data-state";
import { fetchJson, useResource } from "@/components/backend/data/use-resource";
import { Field, FieldRow, Input, Select, Textarea } from "@/components/backend/ui/field";
import { Alert } from "@/components/backend/ui/feedback";

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

type FormState = {
  email: string;
  role: ProfileResponse["profile"]["role"];
  displayName: string;
  bio: string;
  city: string;
  avatarUrl: string;
  profileDetails: ProfileDetails;
  profileFieldVisibility: ProfileFieldVisibilityMap;
  profileVisibility: ProfileVisibility;
  accessState: ProfileResponse["profile"]["accessState"];
  canAccessMembersArea: boolean;
};

const VISIBILITY_HINTS: Record<ProfileVisibility, string> = {
  private: "Your profile is hidden everywhere; individual field toggles are currently inactive.",
  members: "Fields marked public will be visible to approved members only.",
  public: "Fields marked public will appear in both the public directory and the members area.",
  anonymous: "Anonymous mode hides your identity even when fields are marked public.",
};

export default function AccountProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const [avatarPrompt, setAvatarPrompt] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const resource = useResource<ProfileResponse>(
    (signal) => fetchJson<ProfileResponse>("/api/account/profile", { signal }),
    [],
  );

  useEffect(() => {
    if (resource.error?.includes("401") || resource.error?.toLowerCase().includes("unauth")) {
      router.replace("/login?next=/account/profile");
    }
  }, [resource.error, router]);

  useEffect(() => {
    if (!resource.data) return;
    const p = resource.data.profile;
    setForm({
      email: p.email,
      role: p.role,
      displayName: p.displayName,
      bio: p.bio,
      city: p.city,
      avatarUrl: p.avatarUrl,
      profileDetails: p.profileDetails,
      profileFieldVisibility: p.profileFieldVisibility,
      profileVisibility: p.profileVisibility,
      accessState: p.accessState,
      canAccessMembersArea: p.canAccessMembersArea,
    });
  }, [resource.data]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }
  function updateDetail(key: keyof ProfileDetails, value: string) {
    setForm((prev) =>
      prev ? { ...prev, profileDetails: { ...prev.profileDetails, [key]: value } } : prev,
    );
  }
  function updateVisibility(key: keyof ProfileFieldVisibilityMap, value: ProfileFieldVisibility) {
    setForm((prev) =>
      prev
        ? { ...prev, profileFieldVisibility: { ...prev.profileFieldVisibility, [key]: value } }
        : prev,
    );
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !form) return;
    setError("");
    setNotice("");
    setUploadingAvatar(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await fetch("/api/account/avatar/upload", { method: "POST", body: data });
      const body = (await response.json().catch(() => ({}))) as { error?: string; avatarUrl?: string };
      if (!response.ok || !body.avatarUrl) {
        setError(body.error || "Unable to upload avatar");
        return;
      }
      update("avatarUrl", body.avatarUrl);
      setNotice("Avatar uploaded");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function generateAvatar() {
    if (!form) return;
    setError("");
    setNotice("");
    setGeneratingAvatar(true);
    try {
      const body = await fetchJson<{ avatarUrl?: string }>("/api/account/avatar/generate", {
        method: "POST",
        body: JSON.stringify({ prompt: avatarPrompt }),
      }).catch((err: Error) => {
        setError(err.message);
        return null;
      });
      if (body?.avatarUrl) {
        update("avatarUrl", body.avatarUrl);
        setNotice("Avatar generated");
      }
    } finally {
      setGeneratingAvatar(false);
    }
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    setError("");
    setNotice("");
    setSaving(true);
    try {
      await fetchJson("/api/account/profile", {
        method: "PUT",
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
      setNotice("Profile saved");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save profile");
    } finally {
      setSaving(false);
    }
  }

  const hasMemberAccess = !!form?.canAccessMembersArea;
  const shellStats = form
    ? [
        { label: "Role", value: form.role, hint: "Account permission level" },
        {
          label: "Visibility",
          value: form.profileVisibility,
          hint: hasMemberAccess ? "Controls directory listing" : "Restricted until approval",
        },
        {
          label: "Access",
          value: hasMemberAccess ? "approved" : form.accessState.replace("_", " "),
          hint: hasMemberAccess ? "Member tools unlocked" : "Awaiting review",
        },
      ]
    : [];

  return (
    <AccountShell
      currentPath="/account/profile"
      title="Your profile"
      description="Edit your public details and choose who can see your profile."
      eyebrow={hasMemberAccess ? "Members Area" : "Account"}
      stats={shellStats}
      membersAreaEnabled={hasMemberAccess}
    >
      <DataState resource={resource} empty={{ title: "Profile unavailable", description: "We couldn't load your profile." }}>
        {() =>
          form ? (
            <form
              onSubmit={saveProfile}
              style={{ display: "grid", gap: "var(--bk-space-4)", marginTop: "var(--bk-space-4)" }}
            >
              {error ? <Alert tone="danger">{error}</Alert> : null}
              {notice ? <Alert tone="success">{notice}</Alert> : null}

              <Card padded>
                <CardHeader title="Account" description="Identity and contact" />
                <CardBody>
                  <FieldRow cols={2}>
                    <Field label="Email">
                      {(props) => <Input {...props} type="email" value={form.email} readOnly />}
                    </Field>
                    <Field label="Role">
                      {(props) => <Input {...props} value={form.role} readOnly />}
                    </Field>
                  </FieldRow>
                </CardBody>
              </Card>

              <Card padded>
                <CardHeader title="Public profile" description="These fields appear in the directory according to your visibility setting." />
                <CardBody>
                  <FieldRow cols={2}>
                    <Field label="Display name" required>
                      {(props) => (
                        <Input
                          {...props}
                          value={form.displayName}
                          onChange={(e) => update("displayName", e.target.value)}
                          required
                          minLength={2}
                          maxLength={120}
                        />
                      )}
                    </Field>
                    <Field label="Show to">
                      {(props) => (
                        <Select
                          {...props}
                          value={form.profileFieldVisibility.displayName}
                          onChange={(e) => updateVisibility("displayName", e.target.value as ProfileFieldVisibility)}
                        >
                          <option value="public">Public</option>
                          <option value="private">Private</option>
                        </Select>
                      )}
                    </Field>
                  </FieldRow>

                  <FieldRow cols={2}>
                    <Field label="City">
                      {(props) => (
                        <Input
                          {...props}
                          value={form.city}
                          onChange={(e) => update("city", e.target.value)}
                          maxLength={120}
                        />
                      )}
                    </Field>
                    <Field label="Show to">
                      {(props) => (
                        <Select
                          {...props}
                          value={form.profileFieldVisibility.city}
                          onChange={(e) => updateVisibility("city", e.target.value as ProfileFieldVisibility)}
                        >
                          <option value="public">Public</option>
                          <option value="private">Private</option>
                        </Select>
                      )}
                    </Field>
                  </FieldRow>

                  <Field label="Short bio" hint={`${form.bio.length}/500`}>
                    {(props) => (
                      <Textarea
                        {...props}
                        value={form.bio}
                        onChange={(e) => update("bio", e.target.value)}
                        maxLength={500}
                        rows={4}
                      />
                    )}
                  </Field>
                  <Field label="Bio visibility">
                    {(props) => (
                      <Select
                        {...props}
                        value={form.profileFieldVisibility.bio}
                        onChange={(e) => updateVisibility("bio", e.target.value as ProfileFieldVisibility)}
                      >
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                      </Select>
                    )}
                  </Field>

                  <Field
                    label="Directory visibility"
                    hint={VISIBILITY_HINTS[form.profileVisibility]}
                  >
                    {(props) => (
                      <Select
                        {...props}
                        value={form.profileVisibility}
                        onChange={(e) => update("profileVisibility", e.target.value as ProfileVisibility)}
                      >
                        <option value="private">Private</option>
                        <option value="members">Members only</option>
                        <option value="public">Public</option>
                        <option value="anonymous">Anonymous</option>
                      </Select>
                    )}
                  </Field>
                </CardBody>
              </Card>

              <Card padded>
                <CardHeader title="Avatar" description="Upload or generate an image used across the directory." />
                <CardBody>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--bk-space-4)", marginBottom: "var(--bk-space-3)" }}>
                    {form.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.avatarUrl}
                        alt="Avatar preview"
                        style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 96,
                          height: 96,
                          borderRadius: "50%",
                          background: "var(--bk-surface-soft)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 32,
                          fontWeight: 700,
                          color: "var(--bk-text-soft)",
                        }}
                      >
                        {form.displayName.charAt(0).toUpperCase() || "M"}
                      </div>
                    )}
                    <Field label="Avatar visibility">
                      {(props) => (
                        <Select
                          {...props}
                          value={form.profileFieldVisibility.avatarUrl}
                          onChange={(e) => updateVisibility("avatarUrl", e.target.value as ProfileFieldVisibility)}
                        >
                          <option value="public">Public</option>
                          <option value="private">Private</option>
                        </Select>
                      )}
                    </Field>
                  </div>

                  <Field label="Upload image" hint="PNG, JPG, WEBP · max 5MB">
                    {(props) => (
                      <Input
                        {...props}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleAvatarUpload}
                        disabled={uploadingAvatar || generatingAvatar}
                      />
                    )}
                  </Field>

                  <FieldRow cols={2}>
                    <Field label="Generate with AI" hint="Describe the style you want.">
                      {(props) => (
                        <Input
                          {...props}
                          value={avatarPrompt}
                          onChange={(e) => setAvatarPrompt(e.target.value)}
                          maxLength={180}
                          placeholder="Friendly person with glasses and blue hoodie"
                        />
                      )}
                    </Field>
                    <Field label="&nbsp;">
                      {() => (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={generateAvatar}
                          disabled={generatingAvatar || uploadingAvatar || avatarPrompt.trim().length < 3}
                        >
                          {generatingAvatar ? "Generating…" : "Generate avatar"}
                        </Button>
                      )}
                    </Field>
                  </FieldRow>
                </CardBody>
              </Card>

              <Card padded>
                <CardHeader title="Optional details" description="Context for your member profile. Toggle visibility per field." />
                <CardBody>
                  {(["school", "occupation"] as const).map((key) => (
                    <FieldRow key={key} cols={2}>
                      <Field label={key.charAt(0).toUpperCase() + key.slice(1)}>
                        {(props) => (
                          <Input
                            {...props}
                            value={form.profileDetails[key]}
                            onChange={(e) => updateDetail(key, e.target.value)}
                            maxLength={160}
                          />
                        )}
                      </Field>
                      <Field label="Show to">
                        {(props) => (
                          <Select
                            {...props}
                            value={form.profileFieldVisibility[key]}
                            onChange={(e) => updateVisibility(key, e.target.value as ProfileFieldVisibility)}
                          >
                            <option value="public">Public</option>
                            <option value="private">Private</option>
                          </Select>
                        )}
                      </Field>
                    </FieldRow>
                  ))}

                  {(["interests", "hobbies", "funFacts"] as const).map((key) => (
                    <div key={key}>
                      <Field
                        label={key === "funFacts" ? "Fun facts" : key.charAt(0).toUpperCase() + key.slice(1)}
                      >
                        {(props) => (
                          <Textarea
                            {...props}
                            value={form.profileDetails[key]}
                            onChange={(e) => updateDetail(key, e.target.value)}
                            maxLength={500}
                            rows={3}
                          />
                        )}
                      </Field>
                      <Field label="Show to">
                        {(props) => (
                          <Select
                            {...props}
                            value={form.profileFieldVisibility[key]}
                            onChange={(e) => updateVisibility(key, e.target.value as ProfileFieldVisibility)}
                          >
                            <option value="public">Public</option>
                            <option value="private">Private</option>
                          </Select>
                        )}
                      </Field>
                    </div>
                  ))}
                </CardBody>
              </Card>

              <div style={{ display: "flex", gap: "var(--bk-space-3)" }}>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save profile"}
                </Button>
              </div>
            </form>
          ) : null
        }
      </DataState>
    </AccountShell>
  );
}
