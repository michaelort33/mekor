"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe2, LockKeyhole, Mail, Phone, ScrollText, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { QuestionCategory } from "@/lib/ask-mekor/types";
import { cn } from "@/lib/utils";

type AskMekorFormProps = {
  categories: QuestionCategory[];
  sourcePath: string;
  initialVisibility?: "public" | "private";
  title?: string;
  description?: string;
  submitLabel?: string;
  className?: string;
};

export function AskMekorForm({
  categories,
  sourcePath,
  initialVisibility = "public",
  title,
  description,
  submitLabel,
  className,
}: AskMekorFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    askerName: "",
    askerEmail: "",
    askerPhone: "",
    categorySlug: categories[0]?.slug ?? "general",
    title: "",
    body: "",
    visibility: initialVisibility as "public" | "private",
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
    <form
      onSubmit={handleSubmit}
      className={cn(
        "grid gap-5 rounded-[34px] border border-[var(--color-border)] bg-white/90 p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]",
        className,
      )}
    >
      <div className="space-y-3">
        <Badge className="w-fit border-[rgba(31,48,67,0.12)] bg-[var(--color-surface)] text-[var(--color-link)]">Ask Mekor</Badge>
        <div className="space-y-2">
          <h2 className="font-[family-name:var(--font-heading)] text-3xl tracking-[-0.03em] text-[var(--color-foreground)]">
            {title ?? "Ask a question"}
          </h2>
          <p className="max-w-[46rem] text-sm leading-7 text-[var(--color-muted)]">
            {description ??
              "Search the public board first when possible. If your question is personal or sensitive, use the private path instead."}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setForm((current) => ({ ...current, visibility: "public" }))}
          className={cn(
            "rounded-[26px] border p-5 text-left transition",
            form.visibility === "public"
              ? "border-[rgba(47,111,168,0.28)] bg-[rgba(47,111,168,0.08)] shadow-[0_24px_60px_-46px_rgba(47,111,168,0.5)]"
              : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]",
          )}
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(47,111,168,0.12)] text-[var(--color-link)]">
              <Globe2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-base font-semibold text-[var(--color-foreground)]">Public question</p>
              <p className="text-sm text-[var(--color-muted)]">Visible on the board so others can find the answer.</p>
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setForm((current) => ({ ...current, visibility: "private" }))}
          className={cn(
            "rounded-[26px] border p-5 text-left transition",
            form.visibility === "private"
              ? "border-[rgba(31,48,67,0.2)] bg-[rgba(31,48,67,0.07)] shadow-[0_24px_60px_-46px_rgba(15,23,42,0.45)]"
              : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-strong)]",
          )}
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(31,48,67,0.12)] text-[var(--color-foreground)]">
              <LockKeyhole className="h-5 w-5" />
            </span>
            <div>
              <p className="text-base font-semibold text-[var(--color-foreground)]">Private question</p>
              <p className="text-sm text-[var(--color-muted)]">Only visible to you and the Mekor admin team.</p>
            </div>
          </div>
        </button>
      </div>

      <Card className="border-[rgba(31,48,67,0.08)] bg-[var(--color-surface)] shadow-none">
        <CardContent className="grid gap-4 p-5 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              <UserRound className="h-3.5 w-3.5" />
              Your name
            </span>
            <Input
              required
              value={form.askerName}
              onChange={(event) => setForm((current) => ({ ...current, askerName: event.target.value }))}
              placeholder="Full name"
            />
          </label>
          <label className="grid gap-2">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              <Mail className="h-3.5 w-3.5" />
              Your email
            </span>
            <Input
              required
              type="email"
              value={form.askerEmail}
              onChange={(event) => setForm((current) => ({ ...current, askerEmail: event.target.value }))}
              placeholder="you@example.com"
            />
          </label>
          <label className="grid gap-2">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              <Phone className="h-3.5 w-3.5" />
              Phone
            </span>
            <Input
              value={form.askerPhone}
              onChange={(event) => setForm((current) => ({ ...current, askerPhone: event.target.value }))}
              placeholder="Optional"
            />
          </label>
          <label className="grid gap-2">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              <ScrollText className="h-3.5 w-3.5" />
              Category
            </span>
            <select
              className="h-12 rounded-[22px] border border-[var(--color-border-strong)] bg-white/85 px-4 text-[15px] text-[var(--color-foreground)] shadow-[0_15px_35px_-30px_rgba(15,23,42,0.5)] outline-none transition focus:border-[var(--color-ring)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-ring)_14%,transparent)]"
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
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Question title</span>
          <Input
            required
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder={form.visibility === "private" ? "What do you need guidance on?" : "Write a clear public topic title"}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Details</span>
          <Textarea
            required
            rows={7}
            value={form.body}
            onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
            placeholder={
              form.visibility === "private"
                ? "Share the practical details and context. Only Mekor admins and you will see this."
                : "Include the relevant product, ingredients, context, or practical question so others can find the answer later."
            }
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-border)] pt-4">
        <p className="max-w-[34rem] text-sm leading-7 text-[var(--color-muted)]">
          {form.visibility === "private"
            ? "Private questions stay off the public archive. Signed-in askers continue in their inbox thread."
            : "Public questions appear on the board after submission so the answer can help the broader community."}
        </p>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : submitLabel ?? "Submit question"}
        </Button>
      </div>

      {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}
    </form>
  );
}
