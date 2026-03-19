"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { QuestionCategory } from "@/lib/ask-mekor/types";

type AskMekorFormProps = {
  categories: QuestionCategory[];
  sourcePath: string;
};

export function AskMekorForm({ categories, sourcePath }: AskMekorFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    askerName: "",
    askerEmail: "",
    askerPhone: "",
    categorySlug: categories[0]?.slug ?? "general",
    title: "",
    body: "",
    visibility: "public" as "public" | "private",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const response = await fetch("/api/ask-mekor/questions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...form,
        sourcePath,
      }),
    }).catch(() => null);

    setSubmitting(false);

    if (!response) {
      setError("Unable to submit right now. Please try again.");
      return;
    }

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      redirectTo?: string;
    };

    if (!response.ok || !payload.redirectTo) {
      setError(payload.error || "Unable to submit right now. Please try again.");
      return;
    }

    router.push(payload.redirectTo);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 rounded-[30px] border border-[var(--color-border)] bg-white/90 p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Your name</span>
          <Input
            required
            value={form.askerName}
            onChange={(event) => setForm((current) => ({ ...current, askerName: event.target.value }))}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Your email</span>
          <Input
            required
            type="email"
            value={form.askerEmail}
            onChange={(event) => setForm((current) => ({ ...current, askerEmail: event.target.value }))}
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Phone</span>
          <Input
            value={form.askerPhone}
            onChange={(event) => setForm((current) => ({ ...current, askerPhone: event.target.value }))}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Category</span>
          <select
            className="h-11 rounded-[16px] border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-foreground)] outline-none"
            value={form.categorySlug}
            onChange={(event) => setForm((current) => ({ ...current, categorySlug: event.target.value }))}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Visibility</span>
          <select
            className="h-11 rounded-[16px] border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-foreground)] outline-none"
            value={form.visibility}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                visibility: event.target.value === "private" ? "private" : "public",
              }))
            }
          >
            <option value="public">Public question</option>
            <option value="private">Private question</option>
          </select>
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Question title</span>
        <Input
          required
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
        />
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Details</span>
        <Textarea
          required
          rows={6}
          value={form.body}
          onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
        <p className="max-w-[34rem] text-sm text-[var(--color-muted)]">
          Public questions appear on the board after submission. Private questions go only to the Mekor admin/rabbi team, and signed-in askers are redirected into their inbox thread.
        </p>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit question"}
        </Button>
      </div>

      {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}
    </form>
  );
}
