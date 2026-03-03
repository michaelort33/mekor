"use client";

import { FormEvent, useState } from "react";

type ReplyFormProps = {
  token: string;
};

export function MemberConnectReplyForm({ token }: ReplyFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const message = String(formData.get("message") ?? "").trim();

    setSubmitting(true);
    setResult("");

    const response = await fetch("/api/member-connect/replies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, message }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setResult(data.error ?? "Could not send reply.");
      setSubmitting(false);
      return;
    }

    setResult("Reply submitted and sent to the admin relay queue.");
    event.currentTarget.reset();
    setSubmitting(false);
  }

  return (
    <form onSubmit={onSubmit} className="member-ops-form">
      <label>
        Reply
        <textarea name="message" rows={8} required maxLength={5000} />
      </label>
      <button type="submit" disabled={submitting}>{submitting ? "Sending..." : "Send Reply"}</button>
      {result ? <p className="member-ops-form__result" aria-live="polite">{result}</p> : null}
    </form>
  );
}
