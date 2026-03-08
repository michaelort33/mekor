"use client";

import { useState } from "react";

import { usePublicProfilePrefill } from "@/components/forms/use-public-profile-prefill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, inputClassName } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DESIGNATION_OPTIONS } from "@/lib/payments/shared";

export function DonationCheckoutForm({
  title = "Give online",
  description = "Choose the designation clearly so the gift is classified correctly downstream.",
  defaultAmountCents = 1800,
  defaultDesignation = "General donation",
  campaignId = null,
  kind = "donation",
  returnPath = "/donations",
}: {
  title?: string;
  description?: string;
  defaultAmountCents?: number;
  defaultDesignation?: string;
  campaignId?: number | null;
  kind?: "donation" | "campaign_donation" | "membership_dues";
  returnPath?: string;
}) {
  const profile = usePublicProfilePrefill();
  const [amount, setAmount] = useState(String(defaultAmountCents / 100));
  const [designation, setDesignation] = useState(defaultDesignation);
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [hasEditedDonorName, setHasEditedDonorName] = useState(false);
  const [hasEditedDonorEmail, setHasEditedDonorEmail] = useState(false);
  const [hasEditedDonorPhone, setHasEditedDonorPhone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const resolvedDonorName = hasEditedDonorName ? donorName : donorName || profile?.displayName || "";
  const resolvedDonorEmail = hasEditedDonorEmail ? donorEmail : donorEmail || profile?.email || "";
  const resolvedDonorPhone = hasEditedDonorPhone ? donorPhone : donorPhone || profile?.phone || "";

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
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string; url?: string };
    if (!response.ok || !payload.url) {
      setError(payload.error || "Unable to start checkout.");
      setLoading(false);
      return;
    }

    window.location.assign(payload.url);
  }

  return (
    <section className="w-full">
      <Card className="overflow-hidden bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(245,239,229,0.92))] p-5 sm:p-7">
        <div className="grid gap-6">
          <div className="space-y-3">
            <Badge>Secure donation intake</Badge>
          <h3>{title}</h3>
            <p className="max-w-3xl text-base leading-7 text-[var(--color-muted)]">{description}</p>
          </div>

          <form onSubmit={onSubmit} className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Donation amount (USD)</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--color-muted)]" aria-hidden="true">
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
                    onChange={(event) => setDesignation(event.target.value)}
                    className={cn(inputClassName, "appearance-none pr-12")}
                  >
                    {DESIGNATION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                    {DESIGNATION_OPTIONS.includes(defaultDesignation as never) ? null : (
                      <option value={defaultDesignation}>{defaultDesignation}</option>
                    )}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" aria-hidden="true">
                  <svg viewBox="0 0 20 20" focusable="false">
                    <path d="M5.25 7.5 10 12.25 14.75 7.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
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
      </Card>
    </section>
  );
}
