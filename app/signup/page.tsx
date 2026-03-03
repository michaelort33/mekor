"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import styles from "./page.module.css";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(data.error || "Unable to sign up");
      setSubmitting(false);
      return;
    }

    router.push("/account/profile");
    router.refresh();
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1>Create account</h1>
        <p className={styles.subtitle}>Create your Mekor account to access the members area.</p>

        <label className={styles.field}>
          <span>Display name</span>
          <input
            type="text"
            value={form.displayName}
            onChange={(event) => update("displayName", event.target.value)}
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
          />
        </label>

        <label className={styles.field}>
          <span>Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            required
            maxLength={255}
            autoComplete="email"
          />
        </label>

        <label className={styles.field}>
          <span>Password</span>
          <input
            type="password"
            value={form.password}
            onChange={(event) => update("password", event.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>

        <label className={styles.field}>
          <span>Confirm password</span>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(event) => update("confirmPassword", event.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>

        {error ? <p className={styles.error}>{error}</p> : null}

        <button className={styles.button} type="submit" disabled={submitting}>
          {submitting ? "Creating account..." : "Sign up"}
        </button>

        <p className={styles.footer}>
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </form>
    </main>
  );
}
