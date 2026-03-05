"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import styles from "../login/page.module.css";

const AUTH_REQUEST_TIMEOUT_MS = 15000;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Reset link is invalid or has expired.");
      return;
    }

    setError("");
    setNotice("");
    setSubmitting(true);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("/api/auth/password-reset/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
        signal: controller.signal,
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Unable to reset password");
        setSubmitting(false);
        return;
      }

      setNotice("Password updated. Redirecting to login...");
      window.setTimeout(() => {
        window.location.assign("/login?reset=success");
      }, 700);
    } catch {
      setError("Password reset timed out. Please try again.");
      setSubmitting(false);
    } finally {
      window.clearTimeout(timer);
    }
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1>Choose a new password</h1>
        <p className={styles.subtitle}>Use a fresh password with at least 8 characters for your Mekor account.</p>
        <div className={styles.quickLinks}>
          <Link href="/forgot-password">Request a new link</Link>
          <Link href="/login">Back to Login</Link>
        </div>

        <label className={styles.field}>
          <span>New password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>

        <label className={styles.field}>
          <span>Confirm new password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>

        {notice ? <p className={styles.notice}>{notice}</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}

        <button className={styles.button} type="submit" disabled={submitting || !token}>
          {submitting ? "Updating..." : "Save new password"}
        </button>

        {!token ? (
          <p className={styles.footer}>
            This link is missing its token. <Link href="/forgot-password">Request a new reset email</Link>
          </p>
        ) : null}
      </form>
    </main>
  );
}
