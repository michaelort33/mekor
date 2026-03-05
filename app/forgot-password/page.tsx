"use client";

import Link from "next/link";
import { useState } from "react";

import styles from "../login/page.module.css";

const AUTH_REQUEST_TIMEOUT_MS = 15000;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        signal: controller.signal,
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) {
        setError(data.error || "Unable to send reset email");
        setSubmitting(false);
        return;
      }

      setNotice(data.message || "If an account exists for that email, a reset link has been sent.");
      setEmail("");
    } catch {
      setError("Reset request timed out. Please try again.");
    } finally {
      window.clearTimeout(timer);
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1>Reset password</h1>
        <p className={styles.subtitle}>Enter your email and we&apos;ll send you a one-time password reset link.</p>
        <div className={styles.quickLinks}>
          <Link href="/login">Back to Login</Link>
          <Link href="/">Site Home</Link>
        </div>

        <label className={styles.field}>
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            maxLength={255}
            autoComplete="email"
          />
        </label>

        {notice ? <p className={styles.notice}>{notice}</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}

        <button className={styles.button} type="submit" disabled={submitting}>
          {submitting ? "Sending..." : "Email reset link"}
        </button>

        <p className={styles.footer}>
          Remembered it? <Link href="/login">Log in</Link>
        </p>
      </form>
    </main>
  );
}
