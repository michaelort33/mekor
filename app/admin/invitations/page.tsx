"use client";

import { useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { DataState } from "@/components/backend/data/data-state";
import { fetchJson, useResource } from "@/components/backend/data/use-resource";
import { Badge, type BadgeTone } from "@/components/backend/ui/badge";
import { Button } from "@/components/backend/ui/button";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/backend/ui/data-table";
import { Field, Input, Select } from "@/components/backend/ui/field";
import { Modal } from "@/components/backend/ui/modal";
import {
  FilterChip,
  Toolbar,
  ToolbarActions,
  ToolbarFilters,
  ToolbarSearch,
} from "@/components/backend/ui/toolbar";

type InvitationStatus = "active" | "accepted" | "expired" | "revoked";
type InvitationRole = "visitor" | "member" | "admin" | "super_admin";

type InvitationRow = {
  id: number;
  email: string;
  role: InvitationRole;
  invitedByUserId: number;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  status: InvitationStatus;
};

type PageInfo = { nextCursor: string | null; hasNextPage: boolean; limit: number };
type ListResponse = { items: InvitationRow[]; pageInfo: PageInfo };

const STATUS_TONES: Record<InvitationStatus, BadgeTone> = {
  active: "info",
  accepted: "success",
  expired: "warning",
  revoked: "neutral",
};

function buildQuery(p: { email: string; status: string; cursor?: string | null }) {
  const sp = new URLSearchParams();
  if (p.email) sp.set("email", p.email);
  if (p.status) sp.set("status", p.status);
  sp.set("limit", "50");
  if (p.cursor) sp.set("cursor", p.cursor);
  return sp.toString();
}

export default function AdminInvitationsPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"" | InvitationStatus>("");
  const [appended, setAppended] = useState<InvitationRow[]>([]);
  const [appendCursor, setAppendCursor] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const resource = useResource<ListResponse>(
    (signal) => fetchJson<ListResponse>(`/api/admin/invitations?${buildQuery({ email, status })}`, { signal }),
    [email, status],
  );

  const baseItems = resource.data?.items ?? [];
  const items = useMemo(() => {
    const seen = new Set<number>();
    const out: InvitationRow[] = [];
    for (const r of [...baseItems, ...appended]) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      out.push(r);
    }
    return out;
  }, [baseItems, appended]);

  const pageInfo =
    appendCursor === null
      ? resource.data?.pageInfo ?? null
      : { hasNextPage: !!appendCursor, nextCursor: appendCursor, limit: 50 };

  async function loadMore() {
    const cursor = pageInfo?.nextCursor;
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const next = await fetchJson<ListResponse>(`/api/admin/invitations?${buildQuery({ email, status, cursor })}`);
      setAppended((prev) => [...prev, ...next.items]);
      setAppendCursor(next.pageInfo.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  function resetFilters() {
    setEmail("");
    setStatus("");
    setAppended([]);
    setAppendCursor(null);
  }

  async function resend(id: number) {
    setActionError(null);
    try {
      await fetchJson(`/api/admin/invitations/${id}/resend`, { method: "POST" });
      await resource.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to resend");
    }
  }

  async function revoke(id: number) {
    setActionError(null);
    if (!confirm("Revoke this invitation?")) return;
    try {
      await fetchJson(`/api/admin/invitations/${id}/revoke`, { method: "POST" });
      await resource.refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to revoke");
    }
  }

  const stats = useMemo(() => {
    const active = items.filter((i) => i.status === "active").length;
    const accepted = items.filter((i) => i.status === "accepted").length;
    const expired = items.filter((i) => i.status === "expired").length;
    return [
      { label: "Loaded invitations", value: String(items.length), hint: pageInfo?.hasNextPage ? "More available" : "All matches" },
      { label: "Active", value: String(active), hint: "Waiting for acceptance" },
      { label: "Accepted", value: String(accepted), hint: `${expired} expired` },
    ];
  }, [items, pageInfo?.hasNextPage]);

  const columns: DataTableColumn<InvitationRow>[] = [
    {
      id: "email",
      header: "Email",
      accessor: (r) => <strong>{r.email}</strong>,
      sortValue: (r) => r.email,
      exportValue: (r) => r.email,
    },
    {
      id: "role",
      header: "Role",
      accessor: (r) => <Badge tone={r.role === "admin" || r.role === "super_admin" ? "accent" : "neutral"}>{r.role}</Badge>,
      sortValue: (r) => r.role,
      exportValue: (r) => r.role,
    },
    {
      id: "status",
      header: "Status",
      accessor: (r) => <Badge tone={STATUS_TONES[r.status]}>{r.status}</Badge>,
      sortValue: (r) => r.status,
      exportValue: (r) => r.status,
    },
    {
      id: "sent",
      header: "Sent",
      accessor: (r) => new Date(r.createdAt).toLocaleDateString(),
      sortValue: (r) => r.createdAt,
      exportValue: (r) => r.createdAt,
      hideOnMobile: true,
    },
    {
      id: "expires",
      header: "Expires",
      accessor: (r) => new Date(r.expiresAt).toLocaleDateString(),
      sortValue: (r) => r.expiresAt,
      exportValue: (r) => r.expiresAt,
      hideOnMobile: true,
    },
  ];

  return (
    <AdminShell
      currentPath="/admin/invitations"
      title="Invitations"
      description="Send onboarding links. Only super admins can invite admin roles."
      stats={stats}
    >
      <Toolbar>
        <ToolbarSearch value={email} onChange={setEmail} placeholder="Filter by email…" />
        <ToolbarFilters>
          <Select value={status} onChange={(e) => setStatus(e.target.value as InvitationStatus | "")} style={{ minWidth: 140 }}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="accepted">Accepted</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
          </Select>
          {(email || status) ? <FilterChip label="Clear filters" onRemove={resetFilters} /> : null}
        </ToolbarFilters>
        <ToolbarActions>
          <Button variant="ghost" size="sm" onClick={() => void resource.refresh()}>
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreating(true)}>
            Send invitation
          </Button>
        </ToolbarActions>
      </Toolbar>

      {actionError ? (
        <p style={{ color: "var(--bk-danger)", margin: "var(--bk-space-2) 0", fontSize: "var(--bk-text-sm)" }}>{actionError}</p>
      ) : null}

      <DataState resource={resource} empty={{ title: "No invitations", description: "Send your first invitation with the button above." }}>
        {() => (
          <DataTable<InvitationRow>
            rows={items}
            rowId={(r) => r.id}
            columns={columns}
            rowActions={(r) =>
              r.status === "active" || r.status === "expired" ? (
                <>
                  <Button size="sm" variant="ghost" onClick={() => void resend(r.id)}>
                    Resend
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void revoke(r.id)}>
                    Revoke
                  </Button>
                </>
              ) : null
            }
            exportFilename="invitations.csv"
            emptyState="No invitations match"
            pagination={{
              pageSize: 50,
              totalLoaded: items.length,
              hasMore: !!pageInfo?.hasNextPage,
              onLoadMore: () => void loadMore(),
            }}
          />
        )}
      </DataState>

      <Modal open={creating} onClose={() => setCreating(false)} title="Send invitation" size="md">
        <CreateInvitationForm
          onSaved={() => {
            setCreating(false);
            void resource.refresh();
          }}
        />
      </Modal>
    </AdminShell>
  );
}

function CreateInvitationForm({ onSaved }: { onSaved: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitationRole>("member");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await fetchJson(`/api/admin/invitations`, {
        method: "POST",
        body: JSON.stringify({ email, role }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "var(--bk-space-3)" }}>
      <Field label="Email" required>
        {(props) => <Input {...props} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
      </Field>
      <Field label="Role" hint="Admin roles require super admin permissions.">
        {(props) => (
          <Select {...props} value={role} onChange={(e) => setRole(e.target.value as InvitationRole)}>
            <option value="visitor">visitor</option>
            <option value="member">member</option>
            <option value="admin">admin</option>
            <option value="super_admin">super_admin</option>
          </Select>
        )}
      </Field>
      {error ? <p style={{ color: "var(--bk-danger)", margin: 0, fontSize: "var(--bk-text-sm)" }}>{error}</p> : null}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--bk-space-2)" }}>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Sending…" : "Send invitation"}
        </Button>
      </div>
    </form>
  );
}
