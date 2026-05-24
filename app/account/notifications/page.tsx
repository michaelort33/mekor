"use client";

import { useEffect, useState } from "react";

import { AccountShell } from "@/components/account/account-shell";
import { Button } from "@/components/backend/ui/button";
import { Card, CardBody, CardHeader } from "@/components/backend/ui/card";
import { DataState } from "@/components/backend/data/data-state";
import { fetchJson, useResource } from "@/components/backend/data/use-resource";
import { Checkbox } from "@/components/backend/ui/field";
import { Alert } from "@/components/backend/ui/feedback";

type Preferences = {
  email: string;
  autoMessagesEnabled: boolean;
};

type PreferencesResponse = { preferences: Preferences };

export default function AccountNotificationsPage() {
  const resource = useResource<PreferencesResponse>(
    (signal) => fetchJson<PreferencesResponse>("/api/account/notifications", { signal }),
    [],
  );

  const [autoMessagesEnabled, setAutoMessagesEnabled] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (resource.data) {
      setAutoMessagesEnabled(resource.data.preferences.autoMessagesEnabled);
    }
  }, [resource.data]);

  async function save() {
    setError("");
    setNotice("");
    setWorking(true);
    try {
      await fetchJson("/api/account/notifications", {
        method: "PUT",
        body: JSON.stringify({ autoMessagesEnabled }),
      });
      setNotice("Preferences saved.");
      await resource.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save preferences");
    } finally {
      setWorking(false);
    }
  }

  const stats = resource.data
    ? [
        { label: "Email", value: resource.data.preferences.email },
        {
          label: "Renewal reminders",
          value: resource.data.preferences.autoMessagesEnabled ? "On" : "Off",
        },
      ]
    : [];

  return (
    <AccountShell
      currentPath="/account/notifications"
      title="Notifications"
      description="Choose how Mekor reaches out about your membership."
      stats={stats}
    >
      <DataState resource={resource} empty={{ title: "No preferences", description: "We couldn't load your notification settings." }}>
        {() => (
          <div style={{ display: "grid", gap: "var(--bk-space-4)" }}>
            <Card padded>
              <CardHeader
                title="Membership reminders"
                description="Automated messages about renewals, dues, and account activity."
              />
              <CardBody>
                {error ? <Alert tone="danger">{error}</Alert> : null}
                {notice ? <Alert tone="success">{notice}</Alert> : null}
                <div style={{ display: "grid", gap: "var(--bk-space-3)", marginTop: "var(--bk-space-2)" }}>
                  <Checkbox
                    checked={autoMessagesEnabled}
                    onChange={(e) => setAutoMessagesEnabled(e.target.checked)}
                    label="Send me automatic renewal and membership emails"
                  />
                  <p style={{ margin: 0, fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)" }}>
                    When off, you won&apos;t receive automated dues reminders. Critical security and receipt emails are always sent.
                  </p>
                  <div>
                    <Button onClick={save} disabled={working}>
                      {working ? "Saving…" : "Save preferences"}
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card padded>
              <CardHeader title="Transactional emails" description="These cannot be disabled." />
              <CardBody>
                <ul style={{ margin: 0, paddingLeft: "var(--bk-space-4)", color: "var(--bk-text-soft)" }}>
                  <li>Password reset confirmations</li>
                  <li>Payment receipts and refund notices</li>
                  <li>Membership approval decisions</li>
                  <li>Direct messages addressed to you</li>
                </ul>
              </CardBody>
            </Card>
          </div>
        )}
      </DataState>
    </AccountShell>
  );
}
