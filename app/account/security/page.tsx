"use client";

import { useState } from "react";

import { AccountShell } from "@/components/account/account-shell";
import { Badge } from "@/components/backend/ui/badge";
import { Button } from "@/components/backend/ui/button";
import { Card, CardBody, CardHeader } from "@/components/backend/ui/card";
import { DataState } from "@/components/backend/data/data-state";
import { fetchJson, useResource } from "@/components/backend/data/use-resource";
import { Field, Input } from "@/components/backend/ui/field";
import { Alert } from "@/components/backend/ui/feedback";

type AccountSnapshot = {
  id: number;
  email: string;
  displayName: string;
  role: "visitor" | "member" | "admin" | "super_admin";
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  accessState: "approved_member" | "pending_approval" | "declined" | "visitor";
};

type SnapshotResponse = { account: AccountSnapshot };

const PASSWORD_MIN = 8;

export default function AccountSecurityPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwNotice, setPwNotice] = useState("");

  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetNotice, setResetNotice] = useState("");

  const [signoutBusy, setSignoutBusy] = useState(false);

  const resource = useResource<SnapshotResponse>(
    (signal) => fetchJson<SnapshotResponse>("/api/account/security", { signal }),
    [],
  );

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPwError("");
    setPwNotice("");
    if (newPassword.length < PASSWORD_MIN) {
      setPwError(`Password must be at least ${PASSWORD_MIN} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match.");
      return;
    }
    setPwBusy(true);
    try {
      await fetchJson("/api/account/security", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwNotice("Password updated.");
      await resource.refresh();
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Unable to update password");
    } finally {
      setPwBusy(false);
    }
  }

  async function sendResetEmail() {
    setResetError("");
    setResetNotice("");
    const email = resource.data?.account.email;
    if (!email) {
      setResetError("Account email unavailable.");
      return;
    }
    setResetBusy(true);
    try {
      await fetchJson("/api/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setResetNotice("Reset email sent if the address is on file.");
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Unable to send reset email");
    } finally {
      setResetBusy(false);
    }
  }

  async function signOut() {
    setSignoutBusy(true);
    try {
      await fetchJson("/api/auth/logout", { method: "POST" });
      window.location.assign("/login");
    } catch {
      setSignoutBusy(false);
    }
  }

  const account = resource.data?.account;
  const stats = account
    ? [
        { label: "Role", value: account.role.replace("_", " ") },
        {
          label: "Last sign-in",
          value: account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString() : "—",
        },
        {
          label: "Member since",
          value: new Date(account.createdAt).toLocaleDateString(),
        },
      ]
    : [];

  return (
    <AccountShell
      currentPath="/account/security"
      title="Security"
      description="Manage your password and active session."
      stats={stats}
    >
      <DataState resource={resource} empty={{ title: "No account data", description: "We couldn't load your account." }}>
        {() => (
          <div style={{ display: "grid", gap: "var(--bk-space-4)" }}>
            <Card padded>
              <CardHeader
                title="Account"
                description="The identity tied to this session."
                actions={<Badge tone={account?.accessState === "approved_member" ? "success" : "neutral"}>{account?.accessState.replace("_", " ")}</Badge>}
              />
              <CardBody>
                <div style={{ display: "grid", gap: "var(--bk-space-2)" }}>
                  <div>
                    <div style={{ fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)" }}>Display name</div>
                    <div style={{ fontWeight: 600 }}>{account?.displayName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)" }}>Email</div>
                    <div>{account?.email}</div>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card padded>
              <CardHeader title="Change password" description={`Use a strong password of at least ${PASSWORD_MIN} characters.`} />
              <CardBody>
                {pwError ? <Alert tone="danger">{pwError}</Alert> : null}
                {pwNotice ? <Alert tone="success">{pwNotice}</Alert> : null}
                <form onSubmit={changePassword} style={{ display: "grid", gap: "var(--bk-space-3)", marginTop: "var(--bk-space-2)" }}>
                  <Field label="Current password" required>
                    {(p) => (
                      <Input
                        {...p}
                        type="password"
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                    )}
                  </Field>
                  <Field label="New password" required>
                    {(p) => (
                      <Input
                        {...p}
                        type="password"
                        autoComplete="new-password"
                        minLength={PASSWORD_MIN}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    )}
                  </Field>
                  <Field label="Confirm new password" required>
                    {(p) => (
                      <Input
                        {...p}
                        type="password"
                        autoComplete="new-password"
                        minLength={PASSWORD_MIN}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    )}
                  </Field>
                  <div>
                    <Button type="submit" disabled={pwBusy}>
                      {pwBusy ? "Updating…" : "Update password"}
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>

            <Card padded>
              <CardHeader title="Forgot your current password?" description="Send yourself a one-time reset link." />
              <CardBody>
                {resetError ? <Alert tone="danger">{resetError}</Alert> : null}
                {resetNotice ? <Alert tone="success">{resetNotice}</Alert> : null}
                <div style={{ marginTop: "var(--bk-space-2)" }}>
                  <Button variant="secondary" disabled={resetBusy} onClick={sendResetEmail}>
                    {resetBusy ? "Sending…" : "Email me a reset link"}
                  </Button>
                </div>
              </CardBody>
            </Card>

            <Card padded>
              <CardHeader title="Sign out" description="End this browser session and return to the login screen." />
              <CardBody>
                <Button variant="dangerGhost" disabled={signoutBusy} onClick={signOut}>
                  {signoutBusy ? "Signing out…" : "Sign out"}
                </Button>
              </CardBody>
            </Card>
          </div>
        )}
      </DataState>
    </AccountShell>
  );
}
