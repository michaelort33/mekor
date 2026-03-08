"use client";

import { type ChangeEvent, type FormEvent, useState } from "react";

import { usePublicProfilePrefill } from "@/components/forms/use-public-profile-prefill";
import { Button } from "@/components/ui/button";
import { Input, inputClassName } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const VOLUNTEER_OPPORTUNITY_OPTIONS = [
  "Kiddush Preparation",
  "Torah and Haftorah Reading",
  "Meal Train and Shabbat Hospitality",
  "Eruv Checking",
  "Volunteer Mashgiach",
  "General Volunteer Opportunity",
];

type VolunteerFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  opportunity: string;
  availabilityDate: string;
  additionalNote: string;
};

export function buildVolunteerPayload(values: VolunteerFormValues, sourcePath: string) {
  return {
    name: `${values.firstName} ${values.lastName}`.trim(),
    email: values.email,
    phone: values.phone,
    message: [
      `Opportunity: ${values.opportunity}`,
      values.availabilityDate
        ? `Availability Date: ${values.availabilityDate}`
        : "Availability Date: N/A",
      values.additionalNote
        ? `Additional Note: ${values.additionalNote}`
        : "Additional Note: N/A",
      `First Name: ${values.firstName}`,
      `Last Name: ${values.lastName}`,
    ].join("\n"),
    sourcePath,
    firstName: values.firstName,
    lastName: values.lastName,
    opportunity: values.opportunity,
    availabilityDate: values.availabilityDate,
  };
}

export function VolunteerForm() {
  const profile = usePublicProfilePrefill();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [form, setForm] = useState<VolunteerFormValues>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    opportunity: "",
    availabilityDate: "",
    additionalNote: "",
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

  function update(field: keyof VolunteerFormValues, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function onChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    update(event.target.name as keyof VolunteerFormValues, event.target.value);
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formElement = event.currentTarget;
    if (!formElement.reportValidity()) {
      return;
    }

    const firstName = resolvedFirstName.trim();
    const lastName = resolvedLastName.trim();
    const email = resolvedEmail.trim();
    const phone = resolvedPhone.trim();
    const opportunity = form.opportunity.trim();
    const availabilityDate = form.availabilityDate.trim();
    const additionalNote = form.additionalNote.trim();

    if (!firstName || !lastName || !email || !opportunity) {
      return;
    }

    const payload = buildVolunteerPayload(
      {
        firstName,
        lastName,
        email,
        phone,
        opportunity,
        availabilityDate,
        additionalNote,
      },
      window.location.pathname,
    );

    setIsSubmitting(true);
    setIsSuccess(false);

    try {
      const response = await fetch("/api/forms/volunteer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return;
      }

      setForm((current) => ({
        ...current,
        opportunity: "",
        availabilityDate: "",
        additionalNote: "",
      }));
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="grid gap-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">First Name</span>
          <Input
            name="firstName"
            type="text"
            autoComplete="given-name"
            required
            value={resolvedFirstName}
            onChange={(event) => {
              onChange(event);
              setTouched((current) => ({ ...current, firstName: true }));
            }}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Last Name</span>
          <Input
            name="lastName"
            type="text"
            autoComplete="family-name"
            required
            value={resolvedLastName}
            onChange={(event) => {
              onChange(event);
              setTouched((current) => ({ ...current, lastName: true }));
            }}
          />
        </label>

        <label className="grid gap-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Email</span>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            required
            value={resolvedEmail}
            onChange={(event) => {
              onChange(event);
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
              onChange(event);
              setTouched((current) => ({ ...current, phone: true }));
            }}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Availability Date</span>
          <Input name="availabilityDate" type="date" value={form.availabilityDate} onChange={onChange} />
        </label>

        <label className="grid gap-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Volunteer Opportunity</span>
          <div className="relative">
            <select
              name="opportunity"
              required
              value={form.opportunity}
              onChange={onChange}
              className={cn(inputClassName, "appearance-none pr-12")}
            >
              <option value="" disabled>
                Choose an option
              </option>
              {VOLUNTEER_OPPORTUNITY_OPTIONS.map((option) => (
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

        <label className="grid gap-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">Additional Note</span>
          <Textarea
            name="additionalNote"
            rows={4}
            placeholder="Optional: yahrzeit date, preferred role, or scheduling notes"
            value={form.additionalNote}
            onChange={onChange}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-[var(--color-border)] pt-4">
        <Button type="submit" disabled={isSubmitting} aria-disabled={isSubmitting ? "true" : "false"}>
          Submit
        </Button>
        <p
          className="text-sm font-medium text-emerald-700"
          data-mekor-form-success={isSuccess ? "true" : "false"}
          hidden={!isSuccess}
          aria-live="polite"
        >
          Thanks for submitting!
        </p>
      </div>
    </form>
  );
}
