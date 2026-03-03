"use client";

import { FormEvent, useMemo, useState } from "react";

type RenewalFormProps = {
  token: string;
};

export function RenewalForm({ token }: RenewalFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState("");

  const canSubmit = useMemo(() => token.trim().length > 0, [token]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      setResult("Missing token. Please use the renewal link you received.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const planLabel = String(formData.get("planLabel") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();
    const communication = ["email", "sms", "whatsapp"].map((channel) => ({
      channel,
      optIn: Boolean(formData.get(`optin_${channel}`)),
    }));

    setSubmitting(true);
    setResult("");

    const response = await fetch("/api/renewals/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, planLabel, notes, communication }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setResult(data.error ?? "Renewal submission failed.");
      setSubmitting(false);
      return;
    }

    const status = data.result?.renewalStatus ?? "submitted";
    const outstanding = Number(data.result?.outstandingCents ?? 0) / 100;
    setResult(`Submitted. Status: ${status}. Outstanding dues: $${outstanding.toFixed(2)}.`);
    event.currentTarget.reset();
    setSubmitting(false);
  }

  return (
    <form onSubmit={onSubmit} className="member-ops-form">
      <label>
        Membership Plan
        <select name="planLabel" required defaultValue="">
          <option value="" disabled>Choose a plan</option>
          <option value="Single Membership">Single Membership</option>
          <option value="Couple/Family Membership">Couple/Family Membership</option>
          <option value="Student Membership">Student Membership</option>
          <option value="Auxiliary Membership">Auxiliary Membership</option>
        </select>
      </label>

      <fieldset>
        <legend>Communication Preferences</legend>
        <label><input type="checkbox" name="optin_email" /> Email updates</label>
        <label><input type="checkbox" name="optin_sms" /> SMS alerts</label>
        <label><input type="checkbox" name="optin_whatsapp" /> WhatsApp updates</label>
      </fieldset>

      <label>
        Notes
        <textarea name="notes" rows={5} placeholder="Payment plan notes, household updates, accessibility needs, etc." />
      </label>

      <button type="submit" disabled={submitting || !canSubmit}>{submitting ? "Submitting..." : "Submit Renewal"}</button>
      {result ? <p className="member-ops-form__result" aria-live="polite">{result}</p> : null}
    </form>
  );
}
