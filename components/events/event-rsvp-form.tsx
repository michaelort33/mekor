"use client";

import { FormEvent, useState } from "react";

type EventRsvpFormProps = {
  eventSlug: string;
  eventPath: string;
};

export function EventRsvpForm({ eventSlug, eventPath }: EventRsvpFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      attendeeCount: Number.parseInt(String(formData.get("attendeeCount") ?? "1"), 10) || 1,
      note: String(formData.get("note") ?? "").trim(),
      sourcePath: eventPath,
    };

    setSubmitting(true);
    setResult("");

    const response = await fetch(`/api/events/${encodeURIComponent(eventSlug)}/rsvps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setResult(data.error ?? "Unable to submit RSVP.");
      setSubmitting(false);
      return;
    }

    setResult("RSVP submitted. Thank you.");
    event.currentTarget.reset();
    setSubmitting(false);
  }

  return (
    <form onSubmit={onSubmit} className="event-rsvp-form">
      <h2>RSVP</h2>
      <div className="event-rsvp-form__grid">
        <label>
          Name
          <input name="name" required maxLength={120} />
        </label>
        <label>
          Email
          <input name="email" type="email" required maxLength={255} />
        </label>
        <label>
          Phone
          <input name="phone" type="tel" maxLength={60} />
        </label>
        <label>
          Attendees
          <input name="attendeeCount" type="number" min={1} max={20} defaultValue={1} required />
        </label>
      </div>
      <label>
        Note
        <textarea name="note" rows={4} maxLength={2000} />
      </label>
      <button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit RSVP"}</button>
      {result ? <p className="event-rsvp-form__result" aria-live="polite">{result}</p> : null}
    </form>
  );
}
