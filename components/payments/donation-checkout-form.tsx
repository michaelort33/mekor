"use client";

import Link from "next/link";
import { useState } from "react";

import { usePublicProfilePrefill } from "@/components/forms/use-public-profile-prefill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, inputClassName } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DESIGNATION_OPTIONS, DESIGNATION_SUGGESTED_AMOUNTS_CENTS } from "@/lib/payments/shared";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatCents(cents: number) {
  return currency.format(Math.round(cents) / 100);
}

export function DonationCheckoutForm({
  title = "Make a donation",
  description = "Choose what your gift supports, pick an amount, and continue to secure checkout.",
  defaultAmountCents = 1800,
  defaultDesignation = "General donation",
  campaignId = null,
  kind = "donation",
  returnPath = "/donations",
  showSuggestedAmounts = false,
  itemName = null,
  frameless = false,
}: {
  title?: string;
  description?: string;
  defaultAmountCents?: number;
  defaultDesignation?: string;
  campaignId?: number | null;
  kind?: "donation" | "campaign_donation" | "membership_dues";
  returnPath?: string;
  showSuggestedAmounts?: boolean;
  itemName?: string | null;
  frameless?: boolean;
}) {
  const profile = usePublicProfilePrefill();
  const [amount, setAmount] = useState(String(defaultAmountCents / 100));
  const [designation, setDesignation] = useState(defaultDesignation);
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [dedicationNote, setDedicationNote] = useState("");
  const [hasEditedDonorName, setHasEditedDonorName] = useState(false);
  const [hasEditedDonorEmail, setHasEditedDonorEmail] = useState(false);
  const [hasEditedDonorPhone, setHasEditedDonorPhone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const resolvedDonorName = hasEditedDonorName ? donorName : donorName || profile?.displayName || "";
  const resolvedDonorEmail = hasEditedDonorEmail ? donorEmail : donorEmail || profile?.email || "";
  const resolvedDonorPhone = hasEditedDonorPhone ? donorPhone : donorPhone || profile?.phone || "";

  const suggestedAmounts = showSuggestedAmounts ? (DESIGNATION_SUGGESTED_AMOUNTS_CENTS[designation] ?? []) : [];
  const currentAmountCents = Math.round(Number(amount) * 100);
  const hasCustomDefaultDesignation = !DESIGNATION_OPTIONS.some((option) => option === defaultDesignation);

  function handleDesignationChange(nextDesignation: string) {
    setDesignation(nextDesignation);
    if (!showSuggestedAmounts) {
      return;
    }
    const nextSuggestions = DESIGNATION_SUGGESTED_AMOUNTS_CENTS[nextDesignation];
    if (nextSuggestions && nextSuggestions.length > 0) {
      setAmount(String(nextSuggestions[0] / 100));
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const amountCents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents < 100) {
      setError("Enter a valid amount of at least $1.00.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/donations/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountCents,
        designation,
        donorName: resolvedDonorName,
        donorEmail: resolvedDonorEmail,
        donorPhone: resolvedDonorPhone,
        campaignId,
        kind,
        returnPath,
        ...(itemName ? { itemName } : {}),
        ...(dedicationNote.trim() ? { dedicationNote: dedicationNote.trim() } : {}),
      }),
    }).catch(() => null);

    if (!response) {
      setError("Unable to reach checkout. Check your connection and try again.");
      setLoading(false);
      return;
    }

    const payload = (await response.json().catch(() => ({}))) as { error?: string; url?: string };
    if (!response.ok || !payload.url) {
      setError(payload.error || "Unable to start checkout.");
      setLoading(false);
      return;
    }

    window.location.assign(payload.url);
  }

  const formBody = (
    <div className="grid gap-6">
      <div className="space-y-3">
        <h3>{title}</h3>
        <p className="max-w-3xl text-base leading-7 text-[var(--color-muted)]">{description}</p>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          Secure checkout via Stripe · Tax receipt when applicable
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-6">
        {showSuggestedAmounts ? (
          <div className="grid gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">1. What is your gift for?</span>
            <div className="flex flex-wrap gap-2">
              {DESIGNATION_OPTIONS.map((option) => {
                const active = option === designation;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleDesignationChange(option)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-semibold transition",
                      active
                        ? "border-transparent bg-[linear-gradient(180deg,#2f6fa8_0%,#214e79_100%)] text-[#f8fbff] shadow-[0_16px_36px_-26px_rgba(15,23,42,0.6)]"
                        : "border-[var(--color-border-strong)] bg-white/80 text-[var(--color-foreground)] hover:bg-white",
                    )}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {designation === "Kiddush" ? (
              <p className="text-sm leading-6 text-[var(--color-muted)]">
                Sponsoring a specific Kiddush?{" "}
                <Link href="/kiddush" className="font-semibold text-[var(--color-accent)] underline underline-offset-2">
                  Use the guided Kiddush page
                </Link>{" "}
                to pick a package and rate.
              </p>
            ) : null}
          </div>
        ) : null}

        {suggestedAmounts.length > 0 ? (
          <div className="grid gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">2. Choose an amount</span>
            <div className="flex flex-wrap gap-2">
              {suggestedAmounts.map((cents) => {
                const active = cents === currentAmountCents;
                return (
                  <button
                    key={cents}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setAmount(String(cents / 100))}
                    className={cn(
                      "min-w-[84px] rounded-full border px-4 py-2 text-sm font-bold transition",
                      active
                        ? "border-transparent bg-[linear-gradient(180deg,#2f6fa8_0%,#214e79_100%)] text-[#f8fbff] shadow-[0_16px_36px_-26px_rgba(15,23,42,0.6)]"
                        : "border-[var(--color-border-strong)] bg-white/80 text-[var(--color-foreground)] hover:bg-white",
                    )}
                  >
                    {formatCents(cents)}
                  </button>
                );
              })}
              <span className="self-center text-sm text-[var(--color-muted)]">or enter your own below</span>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">
              {showSuggestedAmounts ? "3. Donation amount (USD)" : "Donation amount (USD)"}
            </span>
            <div className="relative">
              <span
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--color-muted)]"
                aria-hidden="true"
              >
                $
              </span>
              <Input
                className="pl-8"
                type="number"
                min="1"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </div>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">What is this donation for?</span>
            <div className="relative">
              <select
                value={designation}
                onChange={(event) => handleDesignationChange(event.target.value)}
                className={cn(inputClassName, "appearance-none pr-12")}
              >
                {DESIGNATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                {hasCustomDefaultDesignation ? <option value={defaultDesignation}>{defaultDesignation}</option> : null}
              </select>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" aria-hidden="true">
                <svg viewBox="0 0 20 20" focusable="false">
                  <path
                    d="M5.25 7.5 10 12.25 14.75 7.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Donor name</span>
            <Input
              value={resolvedDonorName}
              onChange={(event) => {
                setDonorName(event.target.value);
                setHasEditedDonorName(true);
              }}
              autoComplete="name"
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Email for receipt</span>
            <Input
              type="email"
              value={resolvedDonorEmail}
              onChange={(event) => {
                setDonorEmail(event.target.value);
                setHasEditedDonorEmail(true);
              }}
              autoComplete="email"
              required
            />
          </label>

          <label className="grid gap-2 md:col-span-2 xl:col-span-1">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Phone</span>
            <Input
              value={resolvedDonorPhone}
              onChange={(event) => {
                setDonorPhone(event.target.value);
                setHasEditedDonorPhone(true);
              }}
              autoComplete="tel"
              inputMode="tel"
            />
          </label>

          <label className="grid gap-2 md:col-span-2 xl:col-span-3">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">
              Dedication / in honor of (optional)
            </span>
            <Input
              value={dedicationNote}
              onChange={(event) => setDedicationNote(event.target.value)}
              maxLength={300}
              placeholder="e.g. In memory of Sarah bat Avraham"
            />
          </label>
        </div>

        {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}

        <div className="flex flex-col gap-4 border-t border-[var(--color-border)] pt-5 lg:flex-row lg:items-center lg:justify-between">
          <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
            {loading ? "Opening checkout..." : "Continue to secure payment"}
          </Button>
          <p className="max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
            The thank-you note is distinct from the tax receipt. Qualifying gifts receive a separate standardized receipt for tax records.
          </p>
        </div>
      </form>
    </div>
  );

  if (frameless) {
    return <section className="w-full">{formBody}</section>;
  }

  return (
    <section className="w-full">
      <Card className="overflow-hidden bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(245,239,229,0.92))] p-5 sm:p-7">
        {formBody}
      </Card>
    </section>
  );
}
