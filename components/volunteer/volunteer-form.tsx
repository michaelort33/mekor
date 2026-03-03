"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";

const COMMITTEE_OPTIONS = [
  "Hospitality",
  "Kiddush",
  "Learning",
  "Youth Programming",
  "Eruv",
  "Security",
  "Community Care",
] as const;

type VolunteerFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  opportunity: string;
  availabilityDate: string;
  additionalNote: string;
};

type VolunteerSlot = {
  id: number;
  opportunityName: string;
  label: string;
  startAt: string;
  endAt: string | null;
  remaining: number;
  signupOpen: boolean;
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
  const [slots, setSlots] = useState<VolunteerSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadSlots() {
      const response = await fetch("/api/volunteer/slots");
      if (!response.ok) {
        if (mounted) {
          setErrorMessage("Volunteer slot scheduling is unavailable right now. Please email the volunteer team.");
          setLoadingSlots(false);
        }
        return;
      }

      const data = await response.json().catch(() => ({}));
      if (mounted) {
        setSlots(Array.isArray(data.slots) ? data.slots : []);
        setLoadingSlots(false);
      }
    }

    loadSlots();

    return () => {
      mounted = false;
    };
  }, []);

  const openSlots = useMemo(() => slots.filter((slot) => slot.signupOpen), [slots]);

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
    const slotId = Number.parseInt(String(formData.get("slotId") ?? "0"), 10);
    const additionalNote = String(formData.get("additionalNote") ?? "").trim();
    const committeeInterests = COMMITTEE_OPTIONS.filter((committee) => Boolean(formData.get(`committee_${committee}`)));

    if (!firstName || !lastName || !email || !slotId) {
      return;
    }

    const payload = {
      slotId,
      name: `${firstName} ${lastName}`.trim(),
      email,
      phone,
      note: additionalNote,
      committeeInterests,
    };

    setIsSubmitting(true);
    setIsSuccess(false);
    setErrorMessage("");

    const response = await fetch("/api/volunteer/slot-signups", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setErrorMessage(data.error ?? "Unable to submit your signup right now.");
      setIsSubmitting(false);
      return;
    }

    form.reset();
    setIsSuccess(true);
    setIsSubmitting(false);
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

        <label className="volunteer-form__field volunteer-form__field--wide">
          <span>Volunteer Slot</span>
          <select name="slotId" required defaultValue="" disabled={loadingSlots || openSlots.length === 0}>
            <option value="" disabled>
              {loadingSlots ? "Loading slots..." : "Choose an available slot"}
            </option>
            {openSlots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.opportunityName}: {slot.label} ({new Date(slot.startAt).toLocaleString("en-US")}) · {Math.max(slot.remaining, 0)} left
              </option>
            ))}
          </select>
        </label>

        <fieldset className="volunteer-form__field volunteer-form__field--wide">
          <legend>Committee Interests (optional)</legend>
          <div className="volunteer-form__checks">
            {COMMITTEE_OPTIONS.map((committee) => (
              <label key={committee}>
                <input type="checkbox" name={`committee_${committee}`} />
                {committee}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="volunteer-form__field volunteer-form__field--wide">
          <span>Additional Note</span>
          <textarea
            name="additionalNote"
            rows={4}
            placeholder="Optional: scheduling constraints, role preferences, or experience"
          />
        </label>
      </div>

      <div className="volunteer-form__actions">
        <button type="submit" disabled={isSubmitting || loadingSlots} aria-disabled={isSubmitting ? "true" : "false"}>
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>
        <p
          className="volunteer-form__success"
          data-mekor-form-success={isSuccess ? "true" : "false"}
          hidden={!isSuccess}
          aria-live="polite"
        >
          Thanks for submitting!
        </p>
        {errorMessage ? <p className="volunteer-form__error" aria-live="polite">{errorMessage}</p> : null}
      </div>
    </form>
  );
}
