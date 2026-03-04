"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import styles from "./page.module.css";

function resolveNextPath(value: string | null) {
  if (!value) return "/account/profile";
  if (!value.startsWith("/")) return "/account/profile";
  if (value.startsWith("//")) return "/account/profile";
  if (value === "/login" || value.startsWith("/login?")) return "/account/profile";
  if (value === "/signup" || value.startsWith("/signup?")) return "/account/profile";
  if (value === "/logout" || value.startsWith("/logout?")) return "/account/profile";
  if (value.startsWith("/api/")) return "/account/profile";
  return value;
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => resolveNextPath(searchParams.get("next")), [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Login failed");
        setSubmitting(false);
        return;
      }

      window.location.assign(nextPath);
    } catch {
      setError("Login failed");
      setSubmitting(false);
      return;
    }
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1>Log in</h1>
        <p className={styles.subtitle}>Log in to view members and manage your profile.</p>
        <div className={styles.quickLinks}>
          <Link href="/">← Back to Site Home</Link>
          <Link href="/members">Members Area</Link>
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

        <label className={styles.field}>
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            autoComplete="current-password"
          />
        </label>

        {error ? <p className={styles.error}>{error}</p> : null}

        <button className={styles.button} type="submit" disabled={submitting}>
          {submitting ? "Logging in..." : "Log in"}
        </button>

        <p className={styles.footer}>
          Need an account? <Link href="/signup">Sign up</Link>
        </p>
      </form>
    </main>
  );
}
