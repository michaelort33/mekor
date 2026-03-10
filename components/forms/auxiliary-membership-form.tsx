"use client";

import { type ChangeEvent, type FormEvent, useState } from "react";

import { usePublicProfilePrefill } from "@/components/forms/use-public-profile-prefill";
import { Button } from "@/components/ui/button";
import { Input, inputClassName } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MEMBERSHIP_OPTIONS = [
  "Auxiliary Family / Couple",
  "Auxiliary Single Adult",
  "Auxiliary Single Student",
  "Full Membership Inquiry",
];

const CONNECTION_OPTIONS = [
  "Mekor alum",
  "Former member",
  "Supporter outside Philadelphia",
  "Friend of the community",
  "Other",
];

const PAYMENT_OPTIONS = ["Venmo", "PayPal", "PayPal Giving Fund", "Check", "Need to discuss"] as const;

type AuxiliaryMembershipFormProps = {
  sourcePath: string;
};

type FormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  membershipOption: string;
  connectionToMekor: string;
  paymentPreference: string;
  note: string;
};

export function AuxiliaryMembershipForm({ sourcePath }: AuxiliaryMembershipFormProps) {
  const profile = usePublicProfilePrefill();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [form, setForm] = useState<FormValues>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
    membershipOption: "",
    connectionToMekor: "",
    paymentPreference: "",
    note: "",
  });
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
    phone: false,
    city: false,
  });

  const resolvedFirstName = touched.firstName ? form.firstName : form.firstName || profile?.firstName || "";
  const resolvedLastName = touched.lastName ? form.lastName : form.lastName || profile?.lastName || "";
  const resolvedEmail = touched.email ? form.email : form.email || profile?.email || "";
  const resolvedPhone = touched.phone ? form.phone : form.phone || profile?.phone || "";
  const resolvedCity = touched.city ? form.city : form.city || profile?.city || "";

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
    const city = resolvedCity.trim();
    const membershipOption = form.membershipOption.trim();
    const connectionToMekor = form.connectionToMekor.trim();
    const paymentPreference = form.paymentPreference.trim();
    const note = form.note.trim();

    if (!firstName || !lastName || !email || !membershipOption || !paymentPreference) {
      setStatus("error");
      return;
    }

    setIsSubmitting(true);
    setStatus("idle");

    const response = await fetch("/api/forms/auxiliary-membership", {
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
          `Membership Option: ${membershipOption}`,
          `Connection to Mekor: ${connectionToMekor || "Not provided"}`,
          `City / Region: ${city || "Not provided"}`,
          `Payment Preference: ${paymentPreference}`,
          "",
          note || "No additional notes provided.",
        ].join("\n"),
        firstName,
        lastName,
        city,
        membershipOption,
        connectionToMekor,
        paymentPreference,
        note,
      }),
    }).catch(() => null);

    setIsSubmitting(false);

    if (!response || !response.ok) {
      setStatus("error");
      return;
    }

    setForm((current) => ({
      ...current,
      membershipOption: "",
      connectionToMekor: "",
      paymentPreference: "",
      note: "",
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
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">City or region</span>
          <Input
            name="city"
            type="text"
            autoComplete="address-level2"
            placeholder="Optional"
            value={resolvedCity}
            onChange={(event) => {
              onFieldChange(event);
              setTouched((current) => ({ ...current, city: true }));
            }}
          />
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
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Membership option</span>
          <div className="relative">
            <select
              name="membershipOption"
              required
              value={form.membershipOption}
              onChange={onFieldChange}
              className={cn(inputClassName, "appearance-none pr-12")}
            >
              <option value="" disabled>
                Choose a membership option
              </option>
              {MEMBERSHIP_OPTIONS.map((option) => (
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
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Connection to Mekor</span>
          <div className="relative">
            <select
              name="connectionToMekor"
              value={form.connectionToMekor}
              onChange={onFieldChange}
              className={cn(inputClassName, "appearance-none pr-12")}
            >
              <option value="">Choose an option</option>
              {CONNECTION_OPTIONS.map((option) => (
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

      <label className="grid gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Notes</span>
        <Textarea
          name="note"
          rows={5}
          placeholder="Optional: alumni background, household details, questions about rates, or anything else we should know."
          value={form.note}
          onChange={onFieldChange}
        />
      </label>

      <div className="flex flex-wrap items-center gap-4 border-t border-[var(--color-border)] pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Request membership"}
        </Button>
        {status === "success" ? <p className="text-sm font-medium text-emerald-700">Thanks. We received your request.</p> : null}
        {status === "error" ? <p className="text-sm font-medium text-rose-700">Unable to submit right now. Please try again.</p> : null}
      </div>
    </form>
  );
}
