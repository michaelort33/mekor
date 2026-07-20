"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Cake, Check, Croissant, Info, Sandwich, Wine } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { usePublicProfilePrefill } from "@/components/forms/use-public-profile-prefill";
import { SectionCard } from "@/components/marketing/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import styles from "@/app/kiddush/page.module.css";

export type KiddushRate = {
  id: string;
  label: string;
  amountCents: number;
};

export type KiddushOptionIcon = "kiddush" | "birthday" | "thirdMeal" | "bagelBrunch";

export type KiddushOption = {
  title: string;
  body: string;
  icon: KiddushOptionIcon;
  rates: readonly KiddushRate[];
  tagline?: string;
  when?: string;
  note?: string;
  featured?: boolean;
};

type KiddushPaymentSectionProps = {
  options: readonly KiddushOption[];
  returnPath: string;
};

const ICONS: Record<KiddushOptionIcon, LucideIcon> = {
  kiddush: Wine,
  birthday: Cake,
  thirdMeal: Sandwich,
  bagelBrunch: Croissant,
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatCents(cents: number) {
  return currency.format(Math.round(cents) / 100);
}

export function KiddushPaymentSection({ options, returnPath }: KiddushPaymentSectionProps) {
  const profile = usePublicProfilePrefill();

  const [selectedTitle, setSelectedTitle] = useState(options[0]?.title ?? "");
  const [rateByTitle, setRateByTitle] = useState<Record<string, string>>(() =>
    Object.fromEntries(options.map((option) => [option.title, option.rates[0]?.id ?? ""])),
  );
  const [customOpen, setCustomOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [dedication, setDedication] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [editedName, setEditedName] = useState(false);
  const [editedEmail, setEditedEmail] = useState(false);
  const [editedPhone, setEditedPhone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedOption = options.find((option) => option.title === selectedTitle) ?? options[0];
  const selectedRate = useMemo(() => {
    if (!selectedOption) {
      return undefined;
    }
    const rateId = rateByTitle[selectedOption.title];
    return selectedOption.rates.find((rate) => rate.id === rateId) ?? selectedOption.rates[0];
  }, [selectedOption, rateByTitle]);

  const resolvedName = editedName ? donorName : donorName || profile?.displayName || "";
  const resolvedEmail = editedEmail ? donorEmail : donorEmail || profile?.email || "";
  const resolvedPhone = editedPhone ? donorPhone : donorPhone || profile?.phone || "";

  if (!selectedOption || !selectedRate) {
    return null;
  }

  const customCents = Math.round(Number(customAmount) * 100);
  const customValid = customOpen && Number.isFinite(customCents) && customCents >= 100;
  const effectiveCents = customValid ? customCents : selectedRate.amountCents;

  function selectType(title: string) {
    setSelectedTitle(title);
    setCustomOpen(false);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (customOpen && !customValid) {
      setError("Enter a custom amount of at least $1.00, or turn off the custom amount.");
      return;
    }

    setLoading(true);

    const trimmedDedication = dedication.trim();
    const itemName = trimmedDedication
      ? `${selectedOption.title} — ${trimmedDedication}`
      : selectedOption.title;

    const response = await fetch("/api/donations/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountCents: effectiveCents,
        designation: "Kiddush",
        itemName,
        donorName: resolvedName,
        donorEmail: resolvedEmail,
        donorPhone: resolvedPhone,
        kind: "donation",
        returnPath,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string; url?: string };
    if (!response.ok || !payload.url) {
      setError(payload.error || "Unable to start checkout. Please try again or contact the office.");
      setLoading(false);
      return;
    }

    window.location.assign(payload.url);
  }

  return (
    <SectionCard
      title="Sponsor a Kiddush"
      description="Three quick steps: choose a Kiddush, pick your rate, then continue to secure checkout."
      className={styles.checkoutSection}
    >
      <div id="kiddush-payment" className={styles.flowScrollAnchor} />
      <form onSubmit={onSubmit} className={styles.flowGrid}>
        <div className={styles.flowSteps}>
          <section className={styles.step}>
            <h3 className={styles.stepHeading}>
              <span className={styles.stepNumber}>1</span>
              Choose a Kiddush
            </h3>
            <div className={styles.typeGrid} role="radiogroup" aria-label="Kiddush type">
              {options.map((option) => {
                const selected = option.title === selectedOption.title;
                const Icon = ICONS[option.icon];
                const fromCents = Math.min(...option.rates.map((rate) => rate.amountCents));

                return (
                  <button
                    type="button"
                    key={option.title}
                    role="radio"
                    aria-checked={selected}
                    className={cn(
                      styles.typeTile,
                      option.featured && styles.typeTileFeatured,
                      selected && styles.typeTileSelected,
                    )}
                    onClick={() => selectType(option.title)}
                  >
                    {option.tagline ? <span className={styles.typeRibbon}>{option.tagline}</span> : null}
                    <span className={styles.typeCheck} aria-hidden="true">
                      {selected ? <Check strokeWidth={3} /> : null}
                    </span>
                    <span className={styles.typeIcon} aria-hidden="true">
                      <Icon strokeWidth={1.8} />
                    </span>
                    <span className={styles.typeTitle}>{option.title}</span>
                    <span className={styles.typePrice}>
                      {option.rates.length > 1 ? `from ${formatCents(fromCents)}` : formatCents(fromCents)}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className={styles.typeBody}>{selectedOption.body}</p>
            {selectedOption.when ? (
              <p className={styles.optionMeta}>
                <CalendarDays aria-hidden="true" className={styles.optionMetaIcon} />
                <span>{selectedOption.when}</span>
              </p>
            ) : null}
            {selectedOption.note ? (
              <p className={cn(styles.optionMeta, styles.optionNote)}>
                <Info aria-hidden="true" className={styles.optionMetaIcon} />
                <span>{selectedOption.note}</span>
              </p>
            ) : null}
          </section>

          <section className={styles.step}>
            <h3 className={styles.stepHeading}>
              <span className={styles.stepNumber}>2</span>
              Pick your rate
            </h3>
            {selectedOption.rates.length > 1 ? (
              <div className={styles.rateToggle} role="radiogroup" aria-label="Sponsorship rate">
                {selectedOption.rates.map((rate) => {
                  const active = rate.id === selectedRate.id && !customValid;
                  return (
                    <button
                      type="button"
                      key={rate.id}
                      role="radio"
                      aria-checked={active}
                      className={cn(styles.rateOption, active && styles.rateOptionActive)}
                      onClick={() => {
                        setRateByTitle((previous) => ({ ...previous, [selectedOption.title]: rate.id }));
                        setCustomOpen(false);
                      }}
                    >
                      <span className={styles.rateLabel}>{rate.label}</span>
                      <span className={styles.rateAmount}>{formatCents(rate.amountCents)}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className={styles.rateSingle}>
                <span className={styles.rateLabel}>{selectedRate.label}</span>
                <span className={styles.rateAmount}>{formatCents(selectedRate.amountCents)}</span>
              </div>
            )}

            <div className={styles.customAmount}>
              <label className={styles.customToggle}>
                <input
                  type="checkbox"
                  checked={customOpen}
                  onChange={(event) => setCustomOpen(event.target.checked)}
                />
                <span>Give a different amount</span>
              </label>
              {customOpen ? (
                <div className={styles.customField}>
                  <span aria-hidden="true">$</span>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="decimal"
                    placeholder="Enter amount"
                    value={customAmount}
                    onChange={(event) => setCustomAmount(event.target.value)}
                    aria-label="Custom sponsorship amount in dollars"
                  />
                </div>
              ) : null}
            </div>
          </section>

          <section className={styles.step}>
            <h3 className={styles.stepHeading}>
              <span className={styles.stepNumber}>3</span>
              Your details
            </h3>
            <div className={styles.detailGrid}>
              <label className={styles.detailField}>
                <span>Name</span>
                <Input
                  value={resolvedName}
                  onChange={(event) => {
                    setDonorName(event.target.value);
                    setEditedName(true);
                  }}
                  autoComplete="name"
                  required
                />
              </label>
              <label className={styles.detailField}>
                <span>Email for receipt</span>
                <Input
                  type="email"
                  value={resolvedEmail}
                  onChange={(event) => {
                    setDonorEmail(event.target.value);
                    setEditedEmail(true);
                  }}
                  autoComplete="email"
                  required
                />
              </label>
              <label className={styles.detailField}>
                <span>Phone (optional)</span>
                <Input
                  value={resolvedPhone}
                  onChange={(event) => {
                    setDonorPhone(event.target.value);
                    setEditedPhone(true);
                  }}
                  autoComplete="tel"
                  inputMode="tel"
                />
              </label>
              <label className={styles.detailField}>
                <span>Dedication (optional)</span>
                <Input
                  value={dedication}
                  onChange={(event) => setDedication(event.target.value)}
                  placeholder="In honor of…"
                  maxLength={120}
                />
              </label>
            </div>
          </section>
        </div>

        <aside className={styles.summary} aria-label="Sponsorship summary">
          <div className={styles.summaryCard}>
            <p className={styles.summaryEyebrow}>Your sponsorship</p>
            <p className={styles.summaryTitle}>{selectedOption.title}</p>
            <p className={styles.summaryRate}>
              {customValid ? "Custom amount" : selectedRate.label}
              {selectedOption.when ? ` · ${selectedOption.when}` : ""}
            </p>
            {dedication.trim() ? <p className={styles.summaryDedication}>“{dedication.trim()}”</p> : null}
            <div className={styles.summaryTotalRow}>
              <span>Total</span>
              <span className={styles.summaryTotal}>{formatCents(effectiveCents)}</span>
            </div>

            {error ? <p className={styles.summaryError}>{error}</p> : null}

            <Button type="submit" className={styles.summaryButton} disabled={loading}>
              {loading ? "Opening checkout…" : `Pay ${formatCents(effectiveCents)} securely`}
            </Button>
            <p className={styles.summaryHint}>
              Secure card checkout via Stripe. Prefer Venmo or PayPal? Use the links below and email the office your
              dedication.
            </p>
          </div>
        </aside>
      </form>
    </SectionCard>
  );
}
