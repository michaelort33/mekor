"use client";

import { FormEvent, useState } from "react";

type Recipient = {
  id: number;
  displayName: string;
};

type MemberConnectFormProps = {
  recipients: Recipient[];
};

export function MemberConnectForm({ recipients }: MemberConnectFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const payload = {
      senderName: String(formData.get("senderName") ?? "").trim(),
      senderEmail: String(formData.get("senderEmail") ?? "").trim(),
      senderPhone: String(formData.get("senderPhone") ?? "").trim(),
      recipientMemberId: Number.parseInt(String(formData.get("recipientMemberId") ?? "0"), 10),
      subject: String(formData.get("subject") ?? "").trim(),
      message: String(formData.get("message") ?? "").trim(),
    };

    setSubmitting(true);
    setResult("");

    const response = await fetch("/api/member-connect/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setResult(data.error ?? "Could not send request.");
      setSubmitting(false);
      return;
    }

    setResult("Message request submitted. The office will review and relay it.");
    event.currentTarget.reset();
    setSubmitting(false);
  }

  return (
    <form onSubmit={onSubmit} className="member-ops-form">
      <label>
        Your Name
        <input name="senderName" required maxLength={120} />
      </label>
      <label>
        Your Email
        <input name="senderEmail" type="email" required maxLength={255} />
      </label>
      <label>
        Your Phone
        <input name="senderPhone" type="tel" maxLength={60} />
      </label>
      <label>
        Recipient
        <select name="recipientMemberId" required defaultValue="">
          <option value="" disabled>Select a member</option>
          {recipients.map((recipient) => (
            <option key={recipient.id} value={recipient.id}>{recipient.displayName}</option>
          ))}
        </select>
      </label>
      <label>
        Subject
        <input name="subject" maxLength={255} />
      </label>
      <label>
        Message
        <textarea name="message" rows={6} required maxLength={5000} />
      </label>
      <button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit Request"}</button>
      {result ? <p className="member-ops-form__result" aria-live="polite">{result}</p> : null}
    </form>
  );
}
