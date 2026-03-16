"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type FormState = "idle" | "submitting" | "success" | "error";

type HomeContactFormProps = {
  sourcePath: string;
  className?: string;
  fieldClassName?: string;
  inputClassName?: string;
  textareaClassName?: string;
  submitClassName?: string;
  successClassName?: string;
  errorClassName?: string;
};

export function HomeContactForm({
  sourcePath,
  className,
  fieldClassName,
  inputClassName,
  textareaClassName,
  submitClassName,
  successClassName,
  errorClassName,
}: HomeContactFormProps) {
  const [state, setState] = useState<FormState>("idle");
  const [form, setForm] = useState({
    firstName: "",
    email: "",
    message: "",
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const firstName = form.firstName.trim();
    const email = form.email.trim();
    const message = form.message.trim();

    if (!firstName || !email || !message) {
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
        name: firstName,
        email,
        phone: "",
        message,
        sourcePath,
      }),
    }).catch(() => null);

    if (!response || !response.ok) {
      setState("error");
      return;
    }

    setForm({
      firstName: "",
      email: "",
      message: "",
    });
    setState("success");
  }

  return (
    <form className={className} onSubmit={handleSubmit}>
      <label className={fieldClassName}>
        <span>First Name</span>
        <Input
          name="firstName"
          type="text"
          required
          autoComplete="given-name"
          maxLength={120}
          className={inputClassName}
          value={form.firstName}
          onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
        />
      </label>
      <label className={fieldClassName}>
        <span>Email</span>
        <Input
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          maxLength={255}
          className={inputClassName}
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
        />
      </label>
      <label className={fieldClassName}>
        <span>Message</span>
        <Textarea
          name="message"
          required
          rows={6}
          className={textareaClassName}
          value={form.message}
          onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
        />
      </label>
      <Button type="submit" className={submitClassName} disabled={state === "submitting"}>
        {state === "submitting" ? "Submitting..." : "Submit"}
      </Button>
      {state === "success" ? <p className={successClassName}>Thanks for submitting.</p> : null}
      {state === "error" ? <p className={errorClassName}>Unable to submit right now.</p> : null}
    </form>
  );
}
