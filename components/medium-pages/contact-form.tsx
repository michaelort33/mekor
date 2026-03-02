"use client";

import { useState } from "react";

type ContactFormProps = {
  sourcePath: string;
};

type FormState = "idle" | "submitting" | "success" | "error";

export function ContactForm({ sourcePath }: ContactFormProps) {
  const [state, setState] = useState<FormState>("idle");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const payload = new FormData(form);
    const firstName = String(payload.get("firstName") || "").trim();
    const lastName = String(payload.get("lastName") || "").trim();
    const email = String(payload.get("email") || "").trim();
    const phone = String(payload.get("phone") || "").trim();
    const message = String(payload.get("message") || "").trim();
    const name = `${firstName} ${lastName}`.trim();

    if (!name || !email || !message) {
      setState("error");
      return;
    }

    setState("submitting");

    const response = await fetch("/api/forms/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        phone,
        message,
        sourcePath,
      }),
    }).catch(() => null);

    if (!response || !response.ok) {
      setState("error");
      return;
    }

    form.reset();
    setState("success");
  }

  return (
    <form className="medium-contact-form" onSubmit={handleSubmit}>
      <div className="medium-contact-form__row">
        <label>
          <span>First name</span>
          <input name="firstName" type="text" required maxLength={120} autoComplete="given-name" />
        </label>
        <label>
          <span>Last name</span>
          <input name="lastName" type="text" required maxLength={120} autoComplete="family-name" />
        </label>
      </div>

      <div className="medium-contact-form__row">
        <label>
          <span>Email</span>
          <input name="email" type="email" required maxLength={255} autoComplete="email" />
        </label>
        <label>
          <span>Phone (optional)</span>
          <input name="phone" type="tel" maxLength={60} autoComplete="tel" />
        </label>
      </div>

      <label>
        <span>Message</span>
        <textarea name="message" required rows={5} />
      </label>

      <button type="submit" disabled={state === "submitting"}>
        {state === "submitting" ? "Sending..." : "Submit"}
      </button>

      {state === "success" ? <p className="medium-contact-form__status is-success">Thanks for submitting!</p> : null}
      {state === "error" ? (
        <p className="medium-contact-form__status is-error">Unable to submit right now. Please try again.</p>
      ) : null}
    </form>
  );
}
