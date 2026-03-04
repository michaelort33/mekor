"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import styles from "./page.module.css";

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const response = await fetch("/api/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        displayName,
        password,
        confirmPassword,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error || "Unable to accept invitation");
      setSubmitting(false);
      return;
    }

    window.location.href = "/account/profile";
  }

  if (!token) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <h1>Invite link is missing</h1>
          <p>Please open the invitation link from your email.</p>
          <Link href="/">Back to home</Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1>Accept invitation</h1>
        <p>Create your account to join the community.</p>

        <form onSubmit={onSubmit} className={styles.form}>
          <label>
            Display name
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
              minLength={2}
              maxLength={120}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>

          <label>
            Confirm password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>

          {error ? <p className={styles.error}>{error}</p> : null}

          <button type="submit" disabled={submitting}>
            {submitting ? "Activating..." : "Activate account"}
          </button>
        </form>

        <Link href="/">Back to home</Link>
      </section>
    </main>
  );
}
