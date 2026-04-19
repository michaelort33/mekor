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

type UserRole = "visitor" | "member" | "admin" | "super_admin";
type ProfileVisibility = "private" | "members" | "public" | "anonymous";

type UserRow = {
  id: number;
  email: string;
  displayName: string;
  role: UserRole;
  profileVisibility: ProfileVisibility;
  membershipStartDate: string | null;
  membershipRenewalDate: string | null;
  autoMessagesEnabled: boolean;
  stripeCustomerId: string | null;
  outstandingBalanceCents: number;
  createdAt: string;
  lastLoginAt: string | null;
};

type PageInfo = { nextCursor: string | null; hasNextPage: boolean; limit: number };

type ListResponse = {
  items: UserRow[];
  pageInfo: PageInfo;
  actorRole: UserRole;
  canManageAdminRoles: boolean;
};

const USER_ROLES: UserRole[] = ["visitor", "member", "admin", "super_admin"];
const ROLE_TONES: Record<UserRole, BadgeTone> = {
  visitor: "neutral",
  member: "success",
  admin: "accent",
  super_admin: "accent",
};

const dollars = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

function buildQuery(p: { q: string; role: string; cursor?: string | null }) {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.role) sp.set("role", p.role);
  sp.set("limit", "50");
  if (p.cursor) sp.set("cursor", p.cursor);
  return sp.toString();
}

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"" | UserRole>("");
  const [appended, setAppended] = useState<UserRow[]>([]);
  const [appendCursor, setAppendCursor] = useState<string | null>(null);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const resource = useResource<ListResponse>(
    (signal) => fetchJson<ListResponse>(`/api/admin/users?${buildQuery({ q, role })}`, { signal }),
    [q, role],
  );

  const baseItems = resource.data?.items ?? [];
  const items = useMemo(() => {
    const seen = new Set<number>();
    const out: UserRow[] = [];
    for (const u of [...baseItems, ...appended]) {
      if (seen.has(u.id)) continue;
      seen.add(u.id);
      out.push(u);
    }
    return out;
  }, [baseItems, appended]);

  const pageInfo = appendCursor === null ? resource.data?.pageInfo ?? null : { hasNextPage: !!appendCursor, nextCursor: appendCursor, limit: 50 };

  async function loadMore() {
    const cursor = pageInfo?.nextCursor;
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const next = await fetchJson<ListResponse>(`/api/admin/users?${buildQuery({ q, role, cursor })}`);
      setAppended((prev) => [...prev, ...next.items]);
      setAppendCursor(next.pageInfo.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  function resetFilters() {
    setQ("");
    setRole("");
    setAppended([]);
    setAppendCursor(null);
  }

  const columns: DataTableColumn<UserRow>[] = [
    {
      id: "displayName",
      header: "Name",
      accessor: (u) => <strong>{u.displayName || "—"}</strong>,
      sortValue: (u) => u.displayName.toLowerCase(),
      exportValue: (u) => u.displayName,
    },
    {
      id: "email",
      header: "Email",
      accessor: (u) => u.email,
      sortValue: (u) => u.email.toLowerCase(),
      exportValue: (u) => u.email,
    },
    {
      id: "role",
      header: "Role",
      accessor: (u) => <Badge tone={ROLE_TONES[u.role]}>{u.role}</Badge>,
      sortValue: (u) => u.role,
      exportValue: (u) => u.role,
    },
    {
      id: "visibility",
      header: "Visibility",
      accessor: (u) => u.profileVisibility,
      exportValue: (u) => u.profileVisibility,
      hideOnMobile: true,
    },
    {
      id: "renewal",
      header: "Renewal",
      accessor: (u) => (u.membershipRenewalDate ? u.membershipRenewalDate : "—"),
      sortValue: (u) => u.membershipRenewalDate ?? "",
      exportValue: (u) => u.membershipRenewalDate ?? "",
      hideOnMobile: true,
    },
    {
      id: "balance",
      header: "Open dues",
      accessor: (u) =>
        u.outstandingBalanceCents > 0 ? (
          <span style={{ color: "var(--bk-danger)", fontWeight: 700 }}>{dollars(u.outstandingBalanceCents)}</span>
        ) : (
          "—"
        ),
      sortValue: (u) => u.outstandingBalanceCents,
      exportValue: (u) => (u.outstandingBalanceCents / 100).toFixed(2),
      align: "right",
    },
    {
      id: "stripe",
      header: "Stripe",
      accessor: (u) => (u.stripeCustomerId ? <Badge tone="info">linked</Badge> : "—"),
      exportValue: (u) => u.stripeCustomerId ?? "",
      hideOnMobile: true,
    },
    {
      id: "lastLogin",
      header: "Last login",
      accessor: (u) => (u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "—"),
      sortValue: (u) => u.lastLoginAt ?? "",
      exportValue: (u) => u.lastLoginAt ?? "",
      hideOnMobile: true,
    },
  ];

  const stats = useMemo(() => {
    const members = items.filter((u) => u.role === "member" || u.role === "admin" || u.role === "super_admin").length;
    const admins = items.filter((u) => u.role === "admin" || u.role === "super_admin").length;
    const balance = items.reduce((s, u) => s + u.outstandingBalanceCents, 0);
    return [
      { label: "Loaded users", value: String(items.length), hint: pageInfo?.hasNextPage ? "More available" : "All matches" },
      { label: "Members+", value: String(members), hint: `${admins} admins in view` },
      { label: "Open dues (loaded)", value: dollars(balance), hint: "Sum across loaded users" },
    ];
  }, [items, pageInfo?.hasNextPage]);

  return (
    <AdminShell
      currentPath="/admin/users"
      title="Users"
      description="Adjust roles, visibility, renewals, and automation flags for each account."
      stats={stats}
    >
      <Toolbar>
        <ToolbarSearch
          value={q}
          onChange={(next) => {
            setAppended([]);
            setAppendCursor(null);
            setQ(next);
          }}
          placeholder="Search email or display name…"
        />
        <ToolbarFilters>
          <Select
            value={role}
            onChange={(e) => {
              setAppended([]);
              setAppendCursor(null);
              setRole(e.target.value as UserRole | "");
            }}
            style={{ minWidth: 150 }}
          >
            <option value="">All roles</option>
            {USER_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          {(q || role) ? <FilterChip label="Clear filters" onRemove={resetFilters} /> : null}
        </ToolbarFilters>
        <ToolbarActions>
          <Button variant="ghost" size="sm" onClick={() => void resource.refresh()}>
            Refresh
          </Button>
        </ToolbarActions>
      </Toolbar>

      <DataState
        resource={resource}
        empty={{ title: "No users found", description: "Adjust your filters or search." }}
      >
        {() => (
          <DataTable<UserRow>
            rows={items}
            rowId={(u) => u.id}
            columns={columns}
            rowActions={(u) => (
              <Button size="sm" variant="ghost" onClick={() => setEditing(u)}>
                Edit
              </Button>
            )}
            exportFilename="users.csv"
            emptyState="No matching users"
            pagination={{
              pageSize: 50,
              totalLoaded: items.length,
              hasMore: !!pageInfo?.hasNextPage,
              onLoadMore: () => void loadMore(),
            }}
          />
        )}
      </DataState>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `Edit ${editing.displayName || editing.email}` : "Edit user"}
        description="Adjust role, visibility, dates, and notification automation."
        size="lg"
      >
        {editing ? (
          <EditUserForm
            user={editing}
            canManageAdminRoles={resource.data?.canManageAdminRoles ?? false}
            onSaved={() => {
              setEditing(null);
              void resource.refresh();
            }}
          />
        ) : null}
      </Modal>
    </AdminShell>
  );
}

function EditUserForm({
  user,
  canManageAdminRoles,
  onSaved,
}: {
  user: UserRow;
  canManageAdminRoles: boolean;
  onSaved: () => void;
}) {
  const [role, setRole] = useState<UserRole>(user.role);
  const [visibility, setVisibility] = useState<ProfileVisibility>(user.profileVisibility);
  const [start, setStart] = useState(user.membershipStartDate ?? "");
  const [renewal, setRenewal] = useState(user.membershipRenewalDate ?? "");
  const [auto, setAuto] = useState(user.autoMessagesEnabled);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await fetchJson(`/api/admin/users`, {
        method: "PUT",
        body: JSON.stringify({
          id: user.id,
          role,
          profileVisibility: visibility,
          membershipStartDate: start || null,
          membershipRenewalDate: renewal || null,
          autoMessagesEnabled: auto,
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "var(--bk-space-3)" }}>
      <Field label="Role">
        {(props) => (
          <Select {...props} value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            {USER_ROLES.map((r) => (
              <option key={r} value={r} disabled={!canManageAdminRoles && (r === "admin" || r === "super_admin")}>
                {r}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Profile visibility">
        {(props) => (
          <Select {...props} value={visibility} onChange={(e) => setVisibility(e.target.value as ProfileVisibility)}>
            <option value="private">private</option>
            <option value="members">members</option>
            <option value="public">public</option>
            <option value="anonymous">anonymous</option>
          </Select>
        )}
      </Field>
      <Field label="Membership start" hint="YYYY-MM-DD">
        {(props) => <Input {...props} type="date" value={start} onChange={(e) => setStart(e.target.value)} />}
      </Field>
      <Field label="Membership renewal" hint="YYYY-MM-DD">
        {(props) => <Input {...props} type="date" value={renewal} onChange={(e) => setRenewal(e.target.value)} />}
      </Field>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
        <span>Automated messages enabled</span>
      </label>
      {error ? <p style={{ color: "var(--bk-danger)", margin: 0, fontSize: "var(--bk-text-sm)" }}>{error}</p> : null}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--bk-space-2)" }}>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
