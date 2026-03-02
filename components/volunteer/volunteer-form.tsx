"use client";

import { type FormEvent, useState } from "react";

const VOLUNTEER_OPPORTUNITY_OPTIONS = [
  "Torah and Haftorah Reading",
  "Meal Train and Shabbat Hospitality",
  "Eruv Checking and Mashgichim",
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    if (!form.reportValidity()) {
      return;
    }

    const formData = new FormData(form);
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const opportunity = String(formData.get("opportunity") ?? "").trim();
    const availabilityDate = String(formData.get("availabilityDate") ?? "").trim();

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

      form.reset();
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
          <input name="firstName" type="text" autoComplete="given-name" required />
        </label>

        <label className="volunteer-form__field">
          <span>Last Name</span>
          <input name="lastName" type="text" autoComplete="family-name" required />
        </label>

        <label className="volunteer-form__field volunteer-form__field--wide">
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>

        <label className="volunteer-form__field">
          <span>Phone</span>
          <input name="phone" type="tel" autoComplete="tel" />
        </label>

        <label className="volunteer-form__field">
          <span>Availability Date</span>
          <input name="availabilityDate" type="date" />
        </label>

        <label className="volunteer-form__field volunteer-form__field--wide">
          <span>Volunteer Opportunity</span>
          <select name="opportunity" required defaultValue="">
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
