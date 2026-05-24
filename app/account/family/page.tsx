"use client";

import { useMemo, useState } from "react";

import { AccountShell } from "@/components/account/account-shell";
import { Badge, type BadgeTone } from "@/components/backend/ui/badge";
import { Button } from "@/components/backend/ui/button";
import { Card, CardBody, CardHeader } from "@/components/backend/ui/card";
import { DataState } from "@/components/backend/data/data-state";
import { DataTable, type DataTableColumn } from "@/components/backend/ui/data-table";
import { fetchJson, useResource } from "@/components/backend/data/use-resource";
import { Field, FieldRow, Input, Select } from "@/components/backend/ui/field";
import { Alert } from "@/components/backend/ui/feedback";
import {
  FilterChip,
  Toolbar,
  ToolbarFilters,
} from "@/components/backend/ui/toolbar";

type InviteStatus = "pending" | "accepted" | "declined" | "expired" | "revoked";
type RoleInFamily = "primary_adult" | "adult" | "child" | "dependent";

type FamilyOverview = {
  actor: { id: number; email: string; displayName: string; role: "visitor" | "member" | "admin" | "super_admin" };
  family: {
    familyId: number;
    familyName: string;
    familySlug: string;
    familyStatus: "active" | "archived";
    membershipRole: RoleInFamily | null;
    membershipStatus: "pending" | "active" | "former" | null;
  } | null;
  members: Array<{
    id: number;
    userId: number;
    roleInFamily: RoleInFamily;
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
    roleInFamily: RoleInFamily;
    status: InviteStatus;
    contactRequired: boolean;
    expiresAt: string;
    createdAt: string;
  }>;
  joinRequests: Array<{
    id: number;
    requestorUserId: number;
    requestorDisplayName: string;
    requestedRoleInFamily: RoleInFamily;
    status: "pending" | "accepted" | "declined" | "revoked";
    note: string;
    createdAt: string;
    respondedAt: string | null;
  }>;
  duesByMember: Array<{ userId: number; openInvoiceCount: number; totalOpenAmountCents: number }>;
  canManageInvites: boolean;
};

type CreateInviteForm = {
  email: string;
  firstName: string;
  lastName: string;
  roleInFamily: RoleInFamily;
};

const INVITE_TONES: Record<InviteStatus, BadgeTone> = {
  pending: "info",
  accepted: "success",
  declined: "neutral",
  expired: "neutral",
  revoked: "warning",
};

const initialForm: CreateInviteForm = { email: "", firstName: "", lastName: "", roleInFamily: "adult" };

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function isInvitee(invite: FamilyOverview["invites"][number], actor: FamilyOverview["actor"]) {
  if (invite.inviteeUserId && invite.inviteeUserId === actor.id) return true;
  return Boolean(invite.inviteeEmail && invite.inviteeEmail.toLowerCase() === actor.email.toLowerCase());
}

export default function AccountFamilyPage() {
  const [statusFilter, setStatusFilter] = useState<"" | InviteStatus>("pending");
  const [form, setForm] = useState<CreateInviteForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [contactEmails, setContactEmails] = useState<Record<number, string>>({});
  const [busyInviteId, setBusyInviteId] = useState(0);

  const resource = useResource<FamilyOverview>(
    (signal) => fetchJson<FamilyOverview>("/api/families/me", { signal }),
    [],
  );

  const overview = resource.data;
  const duesByUser = useMemo(
    () => new Map((overview?.duesByMember ?? []).map((d) => [d.userId, d])),
    [overview],
  );

  const filteredInvites = useMemo(
    () => overview?.invites.filter((i) => (statusFilter ? i.status === statusFilter : true)) ?? [],
    [overview, statusFilter],
  );
  const pendingCount = overview?.invites.filter((i) => i.status === "pending").length ?? 0;
  const totalOpenDues = overview?.duesByMember.reduce((s, r) => s + r.totalOpenAmountCents, 0) ?? 0;

  async function createInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError("");
    setNotice("");
    setSaving(true);
    try {
      await fetchJson("/api/families/invites", {
        method: "POST",
        body: JSON.stringify({
          email: form.email || undefined,
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          roleInFamily: form.roleInFamily,
        }),
      });
      setForm(initialForm);
      setNotice("Invite sent");
      await resource.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to create invite");
    } finally {
      setSaving(false);
    }
  }

  async function runAction(inviteId: number, action: "accept" | "decline" | "revoke") {
    setActionError("");
    setBusyInviteId(inviteId);
    try {
      await fetchJson(`/api/families/invites/${inviteId}/${action}`, { method: "POST" });
      await resource.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Unable to ${action}`);
    } finally {
      setBusyInviteId(0);
    }
  }

  async function updateContact(inviteId: number) {
    const email = contactEmails[inviteId]?.trim() ?? "";
    if (!email) {
      setActionError("Provide an email before sending");
      return;
    }
    setActionError("");
    setBusyInviteId(inviteId);
    try {
      await fetchJson(`/api/families/invites/${inviteId}/contact`, {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setContactEmails((prev) => ({ ...prev, [inviteId]: "" }));
      await resource.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to update contact");
    } finally {
      setBusyInviteId(0);
    }
  }

  const memberColumns: DataTableColumn<FamilyOverview["members"][number]>[] = [
    {
      id: "member",
      header: "Member",
      accessor: (r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.displayName}</div>
          <div style={{ fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)" }}>{r.email}</div>
        </div>
      ),
      sortValue: (r) => r.displayName,
      exportValue: (r) => `${r.displayName} <${r.email}>`,
    },
    {
      id: "role",
      header: "Role",
      accessor: (r) => <Badge tone="info">{r.roleInFamily}</Badge>,
      exportValue: (r) => r.roleInFamily,
    },
    {
      id: "status",
      header: "Status",
      accessor: (r) => <Badge tone={r.membershipStatus === "active" ? "success" : "neutral"}>{r.membershipStatus}</Badge>,
      exportValue: (r) => r.membershipStatus,
    },
    {
      id: "dues",
      header: "Open dues",
      accessor: (r) => {
        const due = duesByUser.get(r.userId);
        return due ? `${money(due.totalOpenAmountCents)} (${due.openInvoiceCount})` : "—";
      },
      exportValue: (r) => duesByUser.get(r.userId)?.totalOpenAmountCents ?? 0,
      align: "right",
    },
  ];

  const stats = overview
    ? [
        {
          label: "Household",
          value: overview.family ? overview.family.familyName : "None",
          hint: overview.family ? `${overview.members.length} members` : "Send first invite",
        },
        {
          label: "Pending invites",
          value: String(pendingCount),
          hint: overview.canManageInvites ? "You manage access" : "Read-only",
        },
        {
          label: "Open household dues",
          value: money(totalOpenDues),
          hint: `${overview.duesByMember.reduce((s, r) => s + r.openInvoiceCount, 0)} invoice(s)`,
        },
      ]
    : [];

  return (
    <AccountShell
      currentPath="/account/family"
      title="Family"
      description="Invite household members and manage access."
      stats={stats}
    >
      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <DataState resource={resource} empty={{ title: "No family data", description: "Unable to load household" }}>
        {(o) => (
          <div style={{ display: "grid", gap: "var(--bk-space-4)" }}>
            <Card padded>
              <CardHeader
                title={o.family?.familyName ?? "No active family yet"}
                description={
                  o.family
                    ? `You are ${o.family.membershipRole ?? "a member"} in this household.`
                    : "Send your first invite to create an active household."
                }
              />
            </Card>

            {o.canManageInvites ? (
              <Card padded>
                <CardHeader title="Invite a member" description="Email is optional — add later via contact update." />
                <CardBody>
                  <form onSubmit={createInvite} style={{ display: "grid", gap: "var(--bk-space-3)" }}>
                    <FieldRow cols={2}>
                      <Field label="First name">
                        {(p) => (
                          <Input
                            {...p}
                            value={form.firstName}
                            onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                            maxLength={120}
                          />
                        )}
                      </Field>
                      <Field label="Last name">
                        {(p) => (
                          <Input
                            {...p}
                            value={form.lastName}
                            onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
                            maxLength={120}
                          />
                        )}
                      </Field>
                    </FieldRow>
                    <FieldRow cols={2}>
                      <Field label="Email" optional>
                        {(p) => (
                          <Input
                            {...p}
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                            maxLength={255}
                          />
                        )}
                      </Field>
                      <Field label="Role in family">
                        {(p) => (
                          <Select
                            {...p}
                            value={form.roleInFamily}
                            onChange={(e) => setForm((prev) => ({ ...prev, roleInFamily: e.target.value as RoleInFamily }))}
                          >
                            <option value="adult">Adult</option>
                            <option value="child">Child</option>
                            <option value="dependent">Dependent</option>
                            <option value="primary_adult">Primary adult</option>
                          </Select>
                        )}
                      </Field>
                    </FieldRow>
                    <div>
                      <Button type="submit" disabled={saving}>
                        {saving ? "Sending…" : "Send invite"}
                      </Button>
                    </div>
                  </form>
                </CardBody>
              </Card>
            ) : null}

            <section>
              <h3 style={{ margin: "var(--bk-space-2) 0" }}>Household members</h3>
              <DataTable<FamilyOverview["members"][number]>
                rows={o.members}
                rowId={(r) => r.id}
                columns={memberColumns}
                exportFilename="household-members.csv"
                emptyState="No active family members yet"
              />
            </section>

            <section>
              <Toolbar>
                <ToolbarFilters>
                  <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as InviteStatus | "")}>
                    <option value="">All invites</option>
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="declined">Declined</option>
                    <option value="expired">Expired</option>
                    <option value="revoked">Revoked</option>
                  </Select>
                  {statusFilter && statusFilter !== "pending" ? (
                    <FilterChip label="Reset to pending" onRemove={() => setStatusFilter("pending")} />
                  ) : null}
                </ToolbarFilters>
              </Toolbar>
              <h3 style={{ margin: "var(--bk-space-2) 0" }}>Invites</h3>
              {filteredInvites.length === 0 ? (
                <p style={{ color: "var(--bk-text-soft)" }}>No invites in this view.</p>
              ) : (
                <div style={{ display: "grid", gap: "var(--bk-space-2)" }}>
                  {filteredInvites.map((invite) => {
                    const label =
                      `${invite.inviteeFirstName} ${invite.inviteeLastName}`.trim() ||
                      invite.inviteeEmail ||
                      "Pending invite";
                    const canRespond = isInvitee(invite, o.actor);
                    return (
                      <Card key={invite.id} padded>
                        <CardHeader
                          title={
                            <span>
                              {label} <Badge tone={INVITE_TONES[invite.status]}>{invite.status}</Badge>
                            </span>
                          }
                          description={
                            <>
                              {invite.roleInFamily}
                              {invite.inviteeEmail ? ` · ${invite.inviteeEmail}` : " · Awaiting contact"}
                              {` · Expires ${new Date(invite.expiresAt).toLocaleString()}`}
                            </>
                          }
                          actions={
                            <div style={{ display: "flex", gap: 8 }}>
                              {canRespond && invite.status === "pending" ? (
                                <>
                                  <Button size="sm" disabled={busyInviteId === invite.id} onClick={() => runAction(invite.id, "accept")}>
                                    Accept
                                  </Button>
                                  <Button size="sm" variant="secondary" disabled={busyInviteId === invite.id} onClick={() => runAction(invite.id, "decline")}>
                                    Decline
                                  </Button>
                                </>
                              ) : null}
                              {o.canManageInvites && invite.status === "pending" ? (
                                <Button size="sm" variant="dangerGhost" disabled={busyInviteId === invite.id} onClick={() => runAction(invite.id, "revoke")}>
                                  Revoke
                                </Button>
                              ) : null}
                            </div>
                          }
                        />
                        {invite.contactRequired && o.canManageInvites ? (
                          <CardBody>
                            <FieldRow cols={2}>
                              <Field label="Add invitee email">
                                {(p) => (
                                  <Input
                                    {...p}
                                    type="email"
                                    value={contactEmails[invite.id] ?? ""}
                                    onChange={(e) => setContactEmails((prev) => ({ ...prev, [invite.id]: e.target.value }))}
                                    placeholder="invitee@example.com"
                                  />
                                )}
                              </Field>
                              <Field label="&nbsp;">
                                {() => (
                                  <Button
                                    size="sm"
                                    onClick={() => updateContact(invite.id)}
                                    disabled={busyInviteId === invite.id}
                                  >
                                    {busyInviteId === invite.id ? "Sending…" : "Save & send"}
                                  </Button>
                                )}
                              </Field>
                            </FieldRow>
                          </CardBody>
                        ) : null}
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>

            {o.joinRequests.length > 0 ? (
              <section>
                <h3 style={{ margin: "var(--bk-space-2) 0" }}>Join requests</h3>
                <div style={{ display: "grid", gap: "var(--bk-space-2)" }}>
                  {o.joinRequests.map((request) => (
                    <Card key={request.id} padded>
                      <CardHeader
                        title={request.requestorDisplayName}
                        description={
                          <>
                            {request.requestedRoleInFamily} · {request.status} · requested{" "}
                            {new Date(request.createdAt).toLocaleString()}
                          </>
                        }
                      />
                      {request.note ? <CardBody>{request.note}</CardBody> : null}
                    </Card>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </DataState>
    </AccountShell>
  );
}
