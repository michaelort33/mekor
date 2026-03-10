"use client";

import { type ChangeEvent, type FormEvent, useState } from "react";

import { usePublicProfilePrefill } from "@/components/forms/use-public-profile-prefill";
import { Button } from "@/components/ui/button";
import { Input, inputClassName } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const SPONSORSHIP_OPTIONS = [
  "Shabbat & Yom Tov Kiddush",
  "Birthday Kiddush",
  "Third Meal Sponsorship",
  "Bagel Brunch Kiddush",
  "Need help choosing",
] as const;

const PAYMENT_OPTIONS = ["PayPal", "Venmo", "General donation page", "Check", "Need to discuss"] as const;

type KiddushSponsorshipFormProps = {
  sourcePath: string;
};

type FormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  sponsorshipType: string;
  paymentPreference: string;
  occasion: string;
  requestedDate: string;
  dedication: string;
};

export function KiddushSponsorshipForm({ sourcePath }: KiddushSponsorshipFormProps) {
  const profile = usePublicProfilePrefill();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [form, setForm] = useState<FormValues>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    sponsorshipType: "",
    paymentPreference: "",
    occasion: "",
    requestedDate: "",
    dedication: "",
  });
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
    phone: false,
  });

  const resolvedFirstName = touched.firstName ? form.firstName : form.firstName || profile?.firstName || "";
  const resolvedLastName = touched.lastName ? form.lastName : form.lastName || profile?.lastName || "";
  const resolvedEmail = touched.email ? form.email : form.email || profile?.email || "";
  const resolvedPhone = touched.phone ? form.phone : form.phone || profile?.phone || "";

  function update(field: keyof FormValues, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function onFieldChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    update(event.target.name as keyof FormValues, event.target.value);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const firstName = resolvedFirstName.trim();
    const lastName = resolvedLastName.trim();
    const email = resolvedEmail.trim();
    const phone = resolvedPhone.trim();
    const sponsorshipType = form.sponsorshipType.trim();
    const paymentPreference = form.paymentPreference.trim();
    const occasion = form.occasion.trim();
    const requestedDate = form.requestedDate.trim();
    const dedication = form.dedication.trim();

    if (!firstName || !lastName || !email || !sponsorshipType || !paymentPreference) {
      setStatus("error");
      return;
    }

    setIsSubmitting(true);
    setStatus("idle");

    const response = await fetch("/api/forms/kiddush-sponsorship", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `${firstName} ${lastName}`.trim(),
        email,
        phone,
        sourcePath,
        message: [
          `Sponsorship Type: ${sponsorshipType}`,
          `Payment Preference: ${paymentPreference}`,
          `Occasion: ${occasion || "Not provided"}`,
          `Requested Date: ${requestedDate || "Not provided"}`,
          "",
          dedication || "No dedication text provided.",
        ].join("\n"),
        firstName,
        lastName,
        sponsorshipType,
        paymentPreference,
        occasion,
        requestedDate,
        dedication,
      }),
    }).catch(() => null);

    setIsSubmitting(false);

    if (!response || !response.ok) {
      setStatus("error");
      return;
    }

    setForm((current) => ({
      ...current,
      sponsorshipType: "",
      paymentPreference: "",
      occasion: "",
      requestedDate: "",
      dedication: "",
    }));
    setStatus("success");
  }

  return (
    <form className="grid gap-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">First name</span>
          <Input
            name="firstName"
            type="text"
            required
            autoComplete="given-name"
            value={resolvedFirstName}
            onChange={(event) => {
              onFieldChange(event);
              setTouched((current) => ({ ...current, firstName: true }));
            }}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Last name</span>
          <Input
            name="lastName"
            type="text"
            required
            autoComplete="family-name"
            value={resolvedLastName}
            onChange={(event) => {
              onFieldChange(event);
              setTouched((current) => ({ ...current, lastName: true }));
            }}
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Email</span>
          <Input
            name="email"
            type="email"
            required
            autoComplete="email"
            value={resolvedEmail}
            onChange={(event) => {
              onFieldChange(event);
              setTouched((current) => ({ ...current, email: true }));
            }}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Phone</span>
          <Input
            name="phone"
            type="tel"
            autoComplete="tel"
            value={resolvedPhone}
            onChange={(event) => {
              onFieldChange(event);
              setTouched((current) => ({ ...current, phone: true }));
            }}
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Sponsorship type</span>
          <div className="relative">
            <select
              name="sponsorshipType"
              required
              value={form.sponsorshipType}
              onChange={onFieldChange}
              className={cn(inputClassName, "appearance-none pr-12")}
            >
              <option value="" disabled>
                Choose a sponsorship option
              </option>
              {SPONSORSHIP_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" aria-hidden="true">
              <svg viewBox="0 0 20 20" className="h-4 w-4">
                <path d="M5.25 7.5 10 12.25 14.75 7.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Payment preference</span>
          <div className="relative">
            <select
              name="paymentPreference"
              required
              value={form.paymentPreference}
              onChange={onFieldChange}
              className={cn(inputClassName, "appearance-none pr-12")}
            >
              <option value="" disabled>
                Choose payment preference
              </option>
              {PAYMENT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" aria-hidden="true">
              <svg viewBox="0 0 20 20" className="h-4 w-4">
                <path d="M5.25 7.5 10 12.25 14.75 7.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Occasion</span>
          <Input
            name="occasion"
            type="text"
            placeholder="Optional: birthday, yahrtzeit, anniversary, welcome celebration"
            value={form.occasion}
            onChange={onFieldChange}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Requested date</span>
          <Input name="requestedDate" type="date" value={form.requestedDate} onChange={onFieldChange} />
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Dedication or details</span>
        <Textarea
          name="dedication"
          rows={5}
          placeholder="Optional: honoree names, dedication wording, birthday details, or scheduling notes."
          value={form.dedication}
          onChange={onFieldChange}
        />
      </label>

      <div className="flex flex-wrap items-center gap-4 border-t border-[var(--color-border)] pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Request sponsorship"}
        </Button>
        {status === "success" ? <p className="text-sm font-medium text-emerald-700">Thanks. We received your sponsorship request.</p> : null}
        {status === "error" ? <p className="text-sm font-medium text-rose-700">Unable to submit right now. Please try again.</p> : null}
      </div>
    </form>
  );
}
