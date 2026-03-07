"use client";

import { useState } from "react";

import { usePublicProfilePrefill } from "@/components/forms/use-public-profile-prefill";

type ContactFormProps = {
  sourcePath: string;
};

type FormState = "idle" | "submitting" | "success" | "error";

export function ContactForm({ sourcePath }: ContactFormProps) {
  const profile = usePublicProfilePrefill();
  const [state, setState] = useState<FormState>("idle");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: "",
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

  function update(field: "firstName" | "lastName" | "email" | "phone" | "message", value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const firstName = resolvedFirstName.trim();
    const lastName = resolvedLastName.trim();
    const email = resolvedEmail.trim();
    const phone = resolvedPhone.trim();
    const message = form.message.trim();
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

    setForm((current) => ({ ...current, message: "" }));
    setState("success");
  }

  return (
    <form className="medium-contact-form" onSubmit={handleSubmit}>
      <div className="medium-contact-form__row">
        <label>
          <span>First name</span>
          <input
            name="firstName"
            type="text"
            required
            maxLength={120}
            autoComplete="given-name"
            value={resolvedFirstName}
            onChange={(event) => {
              update("firstName", event.target.value);
              setTouched((current) => ({ ...current, firstName: true }));
            }}
          />
        </label>
        <label>
          <span>Last name</span>
          <input
            name="lastName"
            type="text"
            required
            maxLength={120}
            autoComplete="family-name"
            value={resolvedLastName}
            onChange={(event) => {
              update("lastName", event.target.value);
              setTouched((current) => ({ ...current, lastName: true }));
            }}
          />
        </label>
      </div>

      <div className="medium-contact-form__row">
        <label>
          <span>Email</span>
          <input
            name="email"
            type="email"
            required
            maxLength={255}
            autoComplete="email"
            value={resolvedEmail}
            onChange={(event) => {
              update("email", event.target.value);
              setTouched((current) => ({ ...current, email: true }));
            }}
          />
        </label>
        <label>
          <span>Phone (optional)</span>
          <input
            name="phone"
            type="tel"
            maxLength={60}
            autoComplete="tel"
            value={resolvedPhone}
            onChange={(event) => {
              update("phone", event.target.value);
              setTouched((current) => ({ ...current, phone: true }));
            }}
          />
        </label>
      </div>

      <label>
        <span>Message</span>
        <textarea
          name="message"
          required
          rows={5}
          value={form.message}
          onChange={(event) => update("message", event.target.value)}
        />
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
