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
  const [errorMessage, setErrorMessage] = useState("");
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
      setErrorMessage("Please fill in first name, last name, email, membership option, and payment preference.");
      return;
    }

    setIsSubmitting(true);
    setStatus("idle");
    setErrorMessage("");

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
      setErrorMessage("We couldn't send your request. Try again, or email admin@mekorhabracha.org.");
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
    <form className="grid gap-6" onSubmit={handleSubmit} noValidate>
      <p className="m-0 text-sm leading-6 text-[var(--color-muted)]">
        Tell us how you&apos;d like to stay connected. Required fields are marked with *.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-[var(--color-foreground)]">
            First name<span className="text-rose-700" aria-hidden="true"> *</span>
          </span>
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
          <span className="text-sm font-semibold text-[var(--color-foreground)]">
            Last name<span className="text-rose-700" aria-hidden="true"> *</span>
          </span>
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
          <span className="text-sm font-semibold text-[var(--color-foreground)]">
            Email<span className="text-rose-700" aria-hidden="true"> *</span>
          </span>
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
          <span className="text-sm font-semibold text-[var(--color-foreground)]">Phone (optional)</span>
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
          <span className="text-sm font-semibold text-[var(--color-foreground)]">City or region (optional)</span>
          <Input
            name="city"
            type="text"
            autoComplete="address-level2"
            value={resolvedCity}
            onChange={(event) => {
              onFieldChange(event);
              setTouched((current) => ({ ...current, city: true }));
            }}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-[var(--color-foreground)]">
            Payment preference<span className="text-rose-700" aria-hidden="true"> *</span>
          </span>
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
          <span className="text-sm font-semibold text-[var(--color-foreground)]">
            Membership option<span className="text-rose-700" aria-hidden="true"> *</span>
          </span>
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
          <span className="text-sm font-semibold text-[var(--color-foreground)]">Connection to Mekor (optional)</span>
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
        <span className="text-sm font-semibold text-[var(--color-foreground)]">Notes (optional)</span>
        <Textarea
          name="note"
          rows={5}
          placeholder="Alumni background, household details, questions about rates, or anything else we should know."
          value={form.note}
          onChange={onFieldChange}
        />
      </label>

      <div className="grid gap-3 border-t border-[var(--color-border)] pt-4">
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending request…" : "Request auxiliary membership"}
          </Button>
          {status === "success" ? (
            <p role="status" className="m-0 text-sm font-medium text-emerald-800">
              Thanks — we received your request and will follow up by email.
            </p>
          ) : null}
        </div>
        {status === "error" ? (
          <p role="alert" className="m-0 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
            {errorMessage || "Something went wrong. Please try again."}
          </p>
        ) : null}
      </div>
    </form>
  );
}
