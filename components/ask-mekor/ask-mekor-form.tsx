"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, ScrollText, UserRound } from "lucide-react";

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
    subcategorySlug: "",
    title: "",
    body: "",
    visibility: initialVisibility as "public" | "private",
    publicAnonymous: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const selectedCategory = useMemo(
    () => categories.find((category) => category.slug === form.categorySlug) ?? categories[0] ?? null,
    [categories, form.categorySlug],
  );
  const availableSubcategories = selectedCategory?.subcategories ?? [];

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
      issues?: {
        formErrors?: string[];
        fieldErrors?: Record<string, string[] | undefined>;
      };
    };

    if (!response.ok || !payload.redirectTo) {
      const fieldError = Object.values(payload.issues?.fieldErrors ?? {}).flat().find(Boolean);
      const formError = payload.issues?.formErrors?.find(Boolean);
      setError(fieldError || formError || payload.error || "Unable to submit right now. Please try again.");
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
              "Search first when possible, then submit your question with the posting settings that fit it best."}
          </p>
        </div>
      </div>

      <Card className="border-[rgba(31,48,67,0.08)] bg-[var(--color-surface)] shadow-none">
        <CardContent className="grid gap-5 p-5">
          <div className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Posting settings</span>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={form.visibility === "public" ? "default" : "outline"}
                onClick={() => setForm((current) => ({ ...current, visibility: "public" }))}
              >
                Post publicly
              </Button>
              <Button
                type="button"
                variant={form.visibility === "private" ? "default" : "outline"}
                onClick={() => setForm((current) => ({ ...current, visibility: "private", publicAnonymous: false }))}
              >
                Keep private
              </Button>
            </div>
            <p className="text-sm leading-7 text-[var(--color-muted)]">
              Private questions are only visible to you and Mekor admins. Public questions can optionally show as anonymous.
            </p>
          </div>

          {form.visibility === "public" ? (
            <div className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Public attribution</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={form.publicAnonymous ? "outline" : "default"}
                  onClick={() => setForm((current) => ({ ...current, publicAnonymous: false }))}
                >
                  Show my name
                </Button>
                <Button
                  type="button"
                  variant={form.publicAnonymous ? "default" : "outline"}
                  onClick={() => setForm((current) => ({ ...current, publicAnonymous: true }))}
                >
                  Post anonymously
                </Button>
              </div>
              <p className="text-sm leading-7 text-[var(--color-muted)]">
                Mekor admins still see your contact details either way.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

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
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  categorySlug: event.target.value,
                  subcategorySlug: "",
                }))
              }
            >
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 md:col-span-2">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              <ScrollText className="h-3.5 w-3.5" />
              Subcategory
            </span>
            <select
              className="h-12 rounded-[22px] border border-[var(--color-border-strong)] bg-white/85 px-4 text-[15px] text-[var(--color-foreground)] shadow-[0_15px_35px_-30px_rgba(15,23,42,0.5)] outline-none transition focus:border-[var(--color-ring)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-ring)_14%,transparent)] disabled:cursor-not-allowed disabled:opacity-65"
              value={form.subcategorySlug}
              disabled={availableSubcategories.length === 0}
              onChange={(event) => setForm((current) => ({ ...current, subcategorySlug: event.target.value }))}
            >
              <option value="">
                {availableSubcategories.length === 0 ? "No subcategories available" : "No subcategory"}
              </option>
              {availableSubcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.slug}>
                  {subcategory.label}
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
            placeholder="Write a clear, specific topic title"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Details</span>
          <Textarea
            required
            rows={7}
            value={form.body}
            onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
            placeholder="Include the practical details, products, ingredients, or context needed to answer the question well."
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-border)] pt-4">
        <p className="max-w-[34rem] text-sm leading-7 text-[var(--color-muted)]">
          {form.visibility === "private"
            ? "Private questions stay off the board. Signed-in askers continue in their inbox thread."
            : form.publicAnonymous
              ? "This will post publicly under Anonymous."
              : "This will post publicly under your name."}
        </p>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : submitLabel ?? "Submit question"}
        </Button>
      </div>

      {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}
    </form>
  );
}
