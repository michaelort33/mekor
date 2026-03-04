"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./page.module.css";

type Invitation = {
  id: number;
  email: string;
  role: "visitor" | "member" | "admin" | "super_admin";
  invitedByUserId: number;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  status: "active" | "accepted" | "expired" | "revoked";
};

const ROLE_OPTIONS: Invitation["role"][] = ["visitor", "member", "admin", "super_admin"];

export default function AdminInvitationsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Invitation["role"]>("visitor");
  const [statusFilter, setStatusFilter] = useState<"" | Invitation["status"]>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  async function loadInvitations() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const response = await fetch(`/api/admin/invitations?${params.toString()}`);
    if (response.status === 401) {
      router.push("/admin/login");
      return;
    }
    const payload = (await response.json().catch(() => ({}))) as { invitations?: Invitation[]; error?: string };
    if (!response.ok) {
      setError(payload.error || "Unable to load invitations");
      setLoading(false);
      return;
    }
    setInvitations(payload.invitations ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadInvitations().catch(() => {
      setError("Unable to load invitations");
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function onCreateInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const response = await fetch("/api/admin/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error || "Unable to create invitation");
      setSubmitting(false);
      return;
    }
    setEmail("");
    setSubmitting(false);
    await loadInvitations();
  }

  async function onRevoke(id: number) {
    setError("");
    const response = await fetch(`/api/admin/invitations/${id}/revoke`, { method: "POST" });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error || "Unable to revoke invitation");
      return;
    }
    await loadInvitations();
  }

  async function onResend(id: number) {
    setError("");
    const response = await fetch(`/api/admin/invitations/${id}/resend`, { method: "POST" });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error || "Unable to resend invitation");
      return;
    }
    await loadInvitations();
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Invitations</h1>
          <p>Super admins can send onboarding links, preset roles, revoke, and resend invitations.</p>
        </div>
        <div className={styles.links}>
          <Link href="/admin/users">Users admin</Link>
          <Link href="/admin/dues">Dues admin</Link>
          <Link href="/admin/events">Events admin</Link>
          <Link href="/admin/settings">Settings</Link>
        </div>
      </header>

      <section className={styles.card}>
        <h2>Create invitation</h2>
        <form onSubmit={onCreateInvite} className={styles.formRow}>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} required type="email" />
          </label>
          <label>
            Role
            <select value={role} onChange={(event) => setRole(event.target.value as Invitation["role"])}>
              {ROLE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? "Sending..." : "Send invite"}
          </button>
        </form>
      </section>

      <section className={styles.card}>
        <div className={styles.tableHeader}>
          <h2>Invitations</h2>
          <label>
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "" | Invitation["status"])}
            >
              <option value="">all</option>
              <option value="active">active</option>
              <option value="accepted">accepted</option>
              <option value="expired">expired</option>
              <option value="revoked">revoked</option>
            </select>
          </label>
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}
        {loading ? (
          <p>Loading invitations...</p>
        ) : invitations.length === 0 ? (
          <p>No invitations found.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Expires</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {invitations.map((invitation) => (
                <tr key={invitation.id}>
                  <td>{invitation.email}</td>
                  <td>{invitation.role}</td>
                  <td>{invitation.status}</td>
                  <td>{new Date(invitation.expiresAt).toLocaleString()}</td>
                  <td className={styles.actions}>
                    <button
                      type="button"
                      onClick={() => onResend(invitation.id)}
                      disabled={invitation.status === "accepted"}
                    >
                      Resend
                    </button>
                    <button
                      type="button"
                      onClick={() => onRevoke(invitation.id)}
                      disabled={invitation.status !== "active"}
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
