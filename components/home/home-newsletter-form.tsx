"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FormState = "idle" | "submitting" | "success" | "error";

type HomeNewsletterFormProps = {
  sourcePath: string;
  className?: string;
  inputClassName?: string;
  submitClassName?: string;
  successClassName?: string;
  errorClassName?: string;
};

export function HomeNewsletterForm({
  sourcePath,
  className,
  inputClassName,
  submitClassName,
  successClassName,
  errorClassName,
}: HomeNewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>("idle");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setState("error");
      return;
    }

    setState("submitting");

    const response = await fetch("/api/forms/newsletter", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: normalizedEmail,
        sourcePath,
      }),
    }).catch(() => null);

    if (!response || !response.ok) {
      setState("error");
      return;
    }

    setEmail("");
    setState("success");
  }

  return (
    <form className={className} onSubmit={handleSubmit}>
      <Input
        name="email"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        maxLength={255}
        placeholder="Enter your email here"
        value={email}
        className={inputClassName}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Button type="submit" className={submitClassName} disabled={state === "submitting"}>
        {state === "submitting" ? "SUBSCRIBING..." : "SUBSCRIBE"}
      </Button>
      {state === "success" ? <p className={successClassName}>Thanks for subscribing.</p> : null}
      {state === "error" ? <p className={errorClassName}>Unable to subscribe right now.</p> : null}
    </form>
  );
}
