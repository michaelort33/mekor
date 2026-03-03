"use client";

import { useMemo, useState } from "react";

import type { MemberProfileFormValues } from "@/lib/members/form-values";
import type { ProfileVisibility } from "@/lib/members/types";
import styles from "./member-profile-form.module.css";

type MemberProfileFormProps = {
  title: string;
  submitLabel: string;
  initialValues: MemberProfileFormValues;
  onSubmit: (values: MemberProfileFormValues) => Promise<void>;
  allowSlugEdit: boolean;
};

const VISIBILITY_OPTIONS: Array<{ label: string; value: ProfileVisibility }> = [
  { label: "Private", value: "private" },
  { label: "Members only", value: "members_only" },
  { label: "Public", value: "public" },
  { label: "Anonymous", value: "anonymous" },
];

function splitInterests(value: string) {
  return [...new Set(value.split(",").map((entry) => entry.trim()).filter(Boolean))];
}

export function MemberProfileForm({
  title,
  submitLabel,
  initialValues,
  onSubmit,
  allowSlugEdit,
}: MemberProfileFormProps) {
  const [values, setValues] = useState<MemberProfileFormValues>(initialValues);
  const [interestsText, setInterestsText] = useState(initialValues.interests.join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const slugDisabled = useMemo(
    () => !allowSlugEdit || values.visibility === "anonymous",
    [allowSlugEdit, values.visibility],
  );

  function update<K extends keyof MemberProfileFormValues>(key: K, value: MemberProfileFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await onSubmit({
        ...values,
        interests: splitInterests(interestsText),
      });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <header className={styles.header}>
        <h1>{title}</h1>
      </header>

      <label className={styles.field}>
        <span>Visibility</span>
        <select
          value={values.visibility}
          onChange={(event) => update("visibility", event.target.value as ProfileVisibility)}
        >
          {VISIBILITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>Full name</span>
        <input
          type="text"
          required
          value={values.fullName}
          onChange={(event) => update("fullName", event.target.value)}
        />
      </label>

      <label className={styles.field}>
        <span>Slug</span>
        <input
          type="text"
          required={!slugDisabled}
          value={values.slug}
          disabled={slugDisabled}
          onChange={(event) => update("slug", event.target.value)}
          placeholder={values.visibility === "anonymous" ? "Auto-generated for anonymous profiles" : "member-slug"}
        />
      </label>

      <label className={styles.field}>
        <span>Avatar URL</span>
        <input
          type="url"
          value={values.avatarUrl}
          onChange={(event) => update("avatarUrl", event.target.value)}
          placeholder="https://..."
        />
      </label>

      <label className={styles.field}>
        <span>Bio</span>
        <textarea value={values.bio} onChange={(event) => update("bio", event.target.value)} rows={4} />
      </label>

      <label className={styles.field}>
        <span>Interests (comma-separated)</span>
        <input
          type="text"
          value={interestsText}
          onChange={(event) => setInterestsText(event.target.value)}
          placeholder="Learning, Chesed, Family programs"
        />
      </label>

      <div className={styles.gridTwo}>
        <label className={styles.field}>
          <span>City</span>
          <input type="text" value={values.city} onChange={(event) => update("city", event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Email</span>
          <input type="email" value={values.email} onChange={(event) => update("email", event.target.value)} />
        </label>
      </div>

      <label className={styles.field}>
        <span>Phone</span>
        <input type="text" value={values.phone} onChange={(event) => update("phone", event.target.value)} />
      </label>

      {error ? <p className={styles.error}>{error}</p> : null}

      <button type="submit" className={styles.submit} disabled={saving}>
        {saving ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
