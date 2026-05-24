"use client";

import Link from "next/link";
import { useState } from "react";

import { AccountShell } from "@/components/account/account-shell";
import { Button } from "@/components/backend/ui/button";
import { Card, CardBody, CardHeader } from "@/components/backend/ui/card";
import { fetchJson } from "@/components/backend/data/use-resource";
import { Field, Input, Textarea } from "@/components/backend/ui/field";
import { Alert } from "@/components/backend/ui/feedback";

export default function AccountDeletePage() {
  const [password, setPassword] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<{ ticketId: number } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!acknowledged) {
      setError("Please acknowledge the request notice before continuing.");
      return;
    }
    setWorking(true);
    try {
      const body = await fetchJson<{ ok: true; ticketId: number }>("/api/account/delete", {
        method: "POST",
        body: JSON.stringify({ password, confirmEmail, reason }),
      });
      setSubmitted({ ticketId: body.ticketId });
      setPassword("");
      setConfirmEmail("");
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit request");
    } finally {
      setWorking(false);
    }
  }

  return (
    <AccountShell
      currentPath="/account/delete"
      title="Delete account"
      description="Submit a request to permanently remove your Mekor account."
      actions={
        <Link href="/account">
          <Button size="sm" variant="ghost">Back to dashboard</Button>
        </Link>
      }
    >
      {submitted ? (
        <Card padded>
          <CardHeader title="Request received" description={`Your deletion request was filed as ticket #${submitted.ticketId}.`} />
          <CardBody>
            <p style={{ marginTop: 0 }}>
              An administrator will review your request and contact you at the email on file. Active dues, donations,
              and registrations may need to be settled before deletion can complete.
            </p>
            <Link href="/account">
              <Button size="sm">Return to dashboard</Button>
            </Link>
          </CardBody>
        </Card>
      ) : (
        <Card padded>
          <CardHeader
            title="Confirm deletion request"
            description="This sends your request to the Mekor administrators. Your account remains active until staff complete the removal."
          />
          <CardBody>
            <Alert tone="warning">
              Deletion is permanent. Your profile, family links, hosted events, and message history will be removed.
              Tax-relevant payment records may be retained as required by law.
            </Alert>
            {error ? <Alert tone="danger">{error}</Alert> : null}
            <form onSubmit={submit} style={{ display: "grid", gap: "var(--bk-space-3)", marginTop: "var(--bk-space-2)" }}>
              <Field label="Type your account email to confirm" required>
                {(p) => (
                  <Input
                    {...p}
                    type="email"
                    autoComplete="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    required
                  />
                )}
              </Field>
              <Field label="Current password" required>
                {(p) => (
                  <Input
                    {...p}
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                )}
              </Field>
              <Field label="Reason (optional)" optional hint="Helps us improve, and lets staff resolve the request faster.">
                {(p) => (
                  <Textarea
                    {...p}
                    rows={4}
                    maxLength={2000}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                )}
              </Field>
              <label style={{ display: "flex", gap: "var(--bk-space-2)", alignItems: "flex-start", color: "var(--bk-text-soft)" }}>
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                />
                <span>
                  I understand that deletion is permanent and that an administrator will contact me to confirm.
                </span>
              </label>
              <div style={{ display: "flex", gap: "var(--bk-space-2)" }}>
                <Button type="submit" variant="dangerGhost" disabled={working}>
                  {working ? "Submitting…" : "Submit deletion request"}
                </Button>
                <Link href="/account">
                  <Button type="button" variant="ghost">Cancel</Button>
                </Link>
              </div>
            </form>
          </CardBody>
        </Card>
      )}
    </AccountShell>
  );
}
