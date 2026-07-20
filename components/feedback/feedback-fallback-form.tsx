"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SITE_SUGGESTION_KINDS, type SiteSuggestionKind } from "@/lib/feedback/types";

type FeedbackFallbackFormProps = {
  sourcePath: string;
  sessionPublicId: string;
  onSubmitted?: () => void;
};

export function FeedbackFallbackForm({
  sourcePath,
  sessionPublicId,
  onSubmitted,
}: FeedbackFallbackFormProps) {
  const [kind, setKind] = useState<SiteSuggestionKind>("suggestion");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/feedback/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          title,
          body,
          contactName,
          contactEmail,
          sourcePath,
          sessionPublicId,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(payload.error || "Unable to send your note right now.");
        setBusy(false);
        return;
      }
      setDone(true);
      onSubmitted?.();
    } catch {
      setError("Unable to send your note right now.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-[24px] border border-[rgba(39,72,109,0.12)] bg-white/80 px-4 py-5 text-sm leading-6 text-[var(--color-foreground)]">
        <p className="font-semibold">Thank you so much!</p>
        <p className="mt-2 text-[var(--color-muted)]">
          Your suggestion is with the Mekor team. We read every note with gratitude.
        </p>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={onSubmit}>
      <p className="text-sm leading-6 text-[var(--color-muted)]">
        Our chat helper is taking a short break. Share your idea here — we still love hearing from you.
      </p>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Type
        <select
          name="kind"
          className="h-11 rounded-full border border-[var(--color-border)] bg-white px-4 text-sm"
          value={kind}
          onChange={(event) => setKind(event.target.value as SiteSuggestionKind)}
        >
          {SITE_SUGGESTION_KINDS.map((value) => (
            <option key={value} value={value}>
              {value[0]!.toUpperCase() + value.slice(1)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Title
        <Input
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          required
          autoComplete="off"
          placeholder="A short headline for your idea"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Details
        <Textarea
          name="body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          required
          minLength={8}
          maxLength={5000}
          rows={5}
          placeholder="Tell us what would make Mekor better…"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Name <span className="font-normal text-[var(--color-muted)]">(optional)</span>
        <Input
          name="contactName"
          value={contactName}
          onChange={(event) => setContactName(event.target.value)}
          maxLength={120}
          autoComplete="name"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Email <span className="font-normal text-[var(--color-muted)]">(optional)</span>
        <Input
          name="contactEmail"
          type="email"
          value={contactEmail}
          onChange={(event) => setContactEmail(event.target.value)}
          maxLength={255}
          autoComplete="email"
          spellCheck={false}
        />
      </label>
      {error ? <p className="text-sm text-[#a33b3b]" role="alert">{error}</p> : null}
      <Button type="submit" disabled={busy || !title.trim() || body.trim().length < 8}>
        {busy ? "Sending…" : "Send suggestion"}
      </Button>
    </form>
  );
}
