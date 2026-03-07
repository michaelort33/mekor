"use client";

import { type ChangeEvent, type FormEvent, useState } from "react";

import { usePublicProfilePrefill } from "@/components/forms/use-public-profile-prefill";

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
    <form className="volunteer-form" onSubmit={handleSubmit}>
      <div className="volunteer-form__grid">
        <label className="volunteer-form__field">
          <span>First Name</span>
          <input
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

        <label className="volunteer-form__field">
          <span>Last Name</span>
          <input
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

        <label className="volunteer-form__field volunteer-form__field--wide">
          <span>Email</span>
          <input
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

        <label className="volunteer-form__field">
          <span>Phone</span>
          <input
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

        <label className="volunteer-form__field">
          <span>Availability Date</span>
          <input name="availabilityDate" type="date" value={form.availabilityDate} onChange={onChange} />
        </label>

        <label className="volunteer-form__field volunteer-form__field--wide">
          <span>Volunteer Opportunity</span>
          <select name="opportunity" required value={form.opportunity} onChange={onChange}>
            <option value="" disabled>
              Choose an option
            </option>
            {VOLUNTEER_OPPORTUNITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="volunteer-form__field volunteer-form__field--wide">
          <span>Additional Note</span>
          <textarea
            name="additionalNote"
            rows={4}
            placeholder="Optional: yahrzeit date, preferred role, or scheduling notes"
            value={form.additionalNote}
            onChange={onChange}
          />
        </label>
      </div>

      <div className="volunteer-form__actions">
        <button type="submit" disabled={isSubmitting} aria-disabled={isSubmitting ? "true" : "false"}>
          Submit
        </button>
        <p
          className="volunteer-form__success"
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
