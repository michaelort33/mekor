"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { MemberShell } from "@/components/members/member-shell";
import memberShellStyles from "@/components/members/member-shell.module.css";
import styles from "./page.module.css";

type FamilyOverview = {
  actor: {
    id: number;
    email: string;
    displayName: string;
    role: "visitor" | "member" | "admin" | "super_admin";
  };
  family: {
    familyId: number;
    familyName: string;
    familySlug: string;
    familyStatus: "active" | "archived";
    membershipRole: "primary_adult" | "adult" | "child" | "dependent" | null;
    membershipStatus: "pending" | "active" | "former" | null;
  } | null;
  members: Array<{
    id: number;
    userId: number;
    roleInFamily: "primary_adult" | "adult" | "child" | "dependent";
    membershipStatus: "pending" | "active" | "former";
    joinedAt: string;
    displayName: string;
    email: string;
    appRole: "visitor" | "member" | "admin" | "super_admin";
  }>;
  invites: Array<{
    id: number;
    threadId: number;
    inviterUserId: number;
    inviteeUserId: number | null;
    inviteeEmail: string | null;
    inviteeFirstName: string;
    inviteeLastName: string;
    roleInFamily: "primary_adult" | "adult" | "child" | "dependent";
    status: "pending" | "accepted" | "declined" | "expired" | "revoked";
    contactRequired: boolean;
    expiresAt: string;
    createdAt: string;
  }>;
  joinRequests: Array<{
    id: number;
    requestorUserId: number;
    requestorDisplayName: string;
    requestedRoleInFamily: "primary_adult" | "adult" | "child" | "dependent";
    status: "pending" | "accepted" | "declined" | "revoked";
    note: string;
    createdAt: string;
    respondedAt: string | null;
  }>;
  duesByMember: Array<{
    userId: number;
    openInvoiceCount: number;
    totalOpenAmountCents: number;
  }>;
  canManageInvites: boolean;
};

type CreateInviteForm = {
  email: string;
  firstName: string;
  lastName: string;
  roleInFamily: "adult" | "child" | "dependent" | "primary_adult";
};

const initialInviteForm: CreateInviteForm = {
  email: "",
  firstName: "",
  lastName: "",
  roleInFamily: "adult",
};

function isInvitee(invite: FamilyOverview["invites"][number], actor: FamilyOverview["actor"]) {
  if (invite.inviteeUserId && invite.inviteeUserId === actor.id) return true;
  return Boolean(invite.inviteeEmail && invite.inviteeEmail.toLowerCase() === actor.email.toLowerCase());
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function AccountFamilyPage() {
  const router = useRouter();
  const [inviteStatusFilter, setInviteStatusFilter] = useState<"" | FamilyOverview["invites"][number]["status"]>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [overview, setOverview] = useState<FamilyOverview | null>(null);
  const [form, setForm] = useState<CreateInviteForm>(initialInviteForm);
  const [contactEmails, setContactEmails] = useState<Record<number, string>>({});
  const [updatingInviteId, setUpdatingInviteId] = useState<number>(0);

  async function loadOverview() {
    const response = await fetch("/api/families/me");
    if (response.status === 401) {
      router.replace("/login?next=/account/family");
      return;
    }
    const payload = (await response.json().catch(() => ({}))) as FamilyOverview & { error?: string };
    if (!response.ok) {
      setError(payload.error || "Unable to load family data.");
      setLoading(false);
      return;
    }
    setOverview(payload);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const response = await fetch("/api/families/me");
        if (response.status === 401) {
          router.replace("/login?next=/account/family");
          return;
        }
        const payload = (await response.json().catch(() => ({}))) as FamilyOverview & { error?: string };
        if (!response.ok) {
          if (!cancelled) {
            setError(payload.error || "Unable to load family data.");
            setLoading(false);
          }
          return;
        }
        if (!cancelled) {
          setOverview(payload);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load family data.");
          setLoading(false);
        }
      }
    }

    void initialLoad();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function createInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError("");
    setSaving(true);
    const response = await fetch("/api/families/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email || undefined,
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        roleInFamily: form.roleInFamily,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setActionError(payload.error || "Unable to create invite.");
      setSaving(false);
      return;
    }
    setForm(initialInviteForm);
    setSaving(false);
    await loadOverview();
  }

  async function runInviteAction(
    inviteId: number,
    action: "accept" | "decline" | "revoke",
  ) {
    setActionError("");
    const response = await fetch(`/api/families/invites/${inviteId}/${action}`, {
      method: "POST",
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setActionError(payload.error || `Unable to ${action} invite.`);
      return;
    }
    await loadOverview();
  }

  async function updateInviteContact(inviteId: number) {
    const email = contactEmails[inviteId]?.trim() ?? "";
    if (!email) {
      setActionError("Please provide an email address before sending.");
      return;
    }
    setUpdatingInviteId(inviteId);
    setActionError("");
    const response = await fetch(`/api/families/invites/${inviteId}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setUpdatingInviteId(0);
    if (!response.ok) {
      setActionError(payload.error || "Unable to update invite contact.");
      return;
    }
    setContactEmails((prev) => ({ ...prev, [inviteId]: "" }));
    await loadOverview();
  }

  const pendingInvites = useMemo(() => overview?.invites.filter((invite) => invite.status === "pending") ?? [], [overview]);
  const filteredInvites = useMemo(
    () => overview?.invites.filter((invite) => (inviteStatusFilter ? invite.status === inviteStatusFilter : invite.status === "pending")) ?? [],
    [inviteStatusFilter, overview],
  );
  const duesByUserId = useMemo(
    () => new Map((overview?.duesByMember ?? []).map((row) => [row.userId, row])),
    [overview],
  );

  const shellStats = overview
    ? [
        { label: "Household members", value: String(overview.members.length), hint: overview.family ? overview.family.familyName : "No active family yet" },
        { label: "Pending invites", value: String(pendingInvites.length), hint: overview.canManageInvites ? "You can manage household access" : "Read-only access" },
        {
          label: "Open household dues",
          value: formatMoney(overview.duesByMember.reduce((sum, row) => sum + row.totalOpenAmountCents, 0)),
          hint: `${overview.duesByMember.reduce((sum, row) => sum + row.openInvoiceCount, 0)} invoice(s) across household`,
        },
      ]
    : [];

  return (
    <MemberShell
      title="Family Management"
      description="Invite household members and manage active family access."
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Members Area", href: "/members" },
        { label: "Family" },
      ]}
      activeSection="family"
      stats={shellStats}
      actions={
        <>
          <Link href="/account/inbox" className={memberShellStyles.actionPill}>Open inbox</Link>
          <Link href="/account" className={memberShellStyles.actionPill}>Account dashboard</Link>
        </>
      }
    >

      <section className={memberShellStyles.toolbar}>
        <div className={memberShellStyles.toolbarHeader}>
          <p className={memberShellStyles.toolbarTitle}>Invite view</p>
          <p className={memberShellStyles.toolbarMeta}>By default this shows pending invites. Switch status to inspect older invites.</p>
        </div>
        <div className={memberShellStyles.toolbarFields}>
          <label>
            Invite status
            <select value={inviteStatusFilter} onChange={(event) => setInviteStatusFilter(event.target.value as "" | FamilyOverview["invites"][number]["status"])}>
              <option value="">pending</option>
              <option value="accepted">accepted</option>
              <option value="declined">declined</option>
              <option value="expired">expired</option>
              <option value="revoked">revoked</option>
            </select>
          </label>
        </div>
      </section>

      {loading ? <p>Loading family information...</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {overview ? (
        <>
          <section className={`${styles.card} internal-card`}>
            <h2>{overview.family ? overview.family.familyName : "No active family yet"}</h2>
            <p>
              {overview.family
                ? `You are ${overview.family.membershipRole ?? "a member"} in this household.`
                : "Send your first family invite to create an active household group."}
            </p>
          </section>

          <section className={`${styles.card} internal-card`}>
            <h2>Invite a family member</h2>
            <form className={styles.form} onSubmit={createInvite}>
              <label>
                Email (optional)
                <input
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  type="email"
                  maxLength={255}
                  placeholder="member@example.com"
                />
              </label>
              <div className={styles.nameRow}>
                <label>
                  First name
                  <input
                    value={form.firstName}
                    onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
                    type="text"
                    maxLength={120}
                    placeholder="First name"
                  />
                </label>
                <label>
                  Last name
                  <input
                    value={form.lastName}
                    onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
                    type="text"
                    maxLength={120}
                    placeholder="Last name"
                  />
                </label>
              </div>
              <label>
                Role in family
                <select
                  value={form.roleInFamily}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      roleInFamily: event.target.value as CreateInviteForm["roleInFamily"],
                    }))
                  }
                >
                  <option value="adult">Adult</option>
                  <option value="child">Child</option>
                  <option value="dependent">Dependent</option>
                  <option value="primary_adult">Primary adult</option>
                </select>
              </label>
              <button type="submit" disabled={saving}>
                {saving ? "Sending invite..." : "Send family invite"}
              </button>
            </form>
            {actionError ? <p className={styles.error}>{actionError}</p> : null}
          </section>

          <section className={`${styles.card} internal-card`}>
            <h2>Family members</h2>
            {overview.members.length === 0 ? (
              <p>No active family members yet.</p>
            ) : (
              <ul className={styles.list}>
                {overview.members.map((member) => (
                  <li key={member.id}>
                    <strong>{member.displayName}</strong>
                    <p>
                      {member.email} · {member.roleInFamily} · {member.membershipStatus}
                    </p>
                    {duesByUserId.get(member.userId) ? (
                      <p>
                        {formatMoney(duesByUserId.get(member.userId)!.totalOpenAmountCents)} open ·{" "}
                        {duesByUserId.get(member.userId)!.openInvoiceCount} invoice(s)
                      </p>
                    ) : (
                      <p>No open dues.</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={`${styles.card} internal-card`}>
            <h2>Join requests</h2>
            {overview.joinRequests.length === 0 ? (
              <p>No household join requests yet.</p>
            ) : (
              <ul className={styles.list}>
                {overview.joinRequests.map((request) => (
                  <li key={request.id}>
                    <strong>{request.requestorDisplayName}</strong>
                    <p>
                      {request.requestedRoleInFamily} · {request.status} · requested{" "}
                      {new Date(request.createdAt).toLocaleString()}
                    </p>
                    {request.note ? <p>{request.note}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={`${styles.card} internal-card`}>
            <h2>{inviteStatusFilter ? `${inviteStatusFilter} invites` : "Pending invites"}</h2>
            {filteredInvites.length === 0 ? (
              <p>No invites in this view.</p>
            ) : (
              <ul className={styles.list}>
                {filteredInvites.map((invite) => {
                  const label = `${invite.inviteeFirstName} ${invite.inviteeLastName}`.trim() || invite.inviteeEmail || "Pending invite";
                  const actorCanRespond = isInvitee(invite, overview.actor);
                  return (
                    <li key={invite.id}>
                      <strong>{label}</strong>
                      <p>
                        {invite.roleInFamily}
                        {invite.inviteeEmail ? ` · ${invite.inviteeEmail}` : " · Awaiting contact details"}
                        {` · Expires ${new Date(invite.expiresAt).toLocaleString()}`}
                      </p>
                      {invite.contactRequired && overview.canManageInvites ? (
                        <div className={styles.contactRow}>
                          <input
                            type="email"
                            placeholder="invitee@email.com"
                            value={contactEmails[invite.id] ?? ""}
                            onChange={(event) =>
                              setContactEmails((prev) => ({
                                ...prev,
                                [invite.id]: event.target.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            onClick={() => updateInviteContact(invite.id)}
                            disabled={updatingInviteId === invite.id}
                          >
                            {updatingInviteId === invite.id ? "Sending..." : "Add email and send"}
                          </button>
                        </div>
                      ) : null}
                      <div className={styles.rowActions}>
                        {actorCanRespond ? (
                          <>
                            <button type="button" onClick={() => runInviteAction(invite.id, "accept")}>
                              Accept
                            </button>
                            <button type="button" onClick={() => runInviteAction(invite.id, "decline")}>
                              Decline
                            </button>
                          </>
                        ) : null}
                        {overview.canManageInvites ? (
                          <button type="button" onClick={() => runInviteAction(invite.id, "revoke")}>
                            Revoke
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </MemberShell>
  );
}
