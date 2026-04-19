"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { DataState } from "@/components/backend/data/data-state";
import { fetchJson, useResource } from "@/components/backend/data/use-resource";
import { Badge, type BadgeTone } from "@/components/backend/ui/badge";
import { Button, LinkButton } from "@/components/backend/ui/button";
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

type PersonStatus = "lead" | "invited" | "visitor" | "guest" | "member" | "admin" | "super_admin" | "inactive";

type PersonRow = {
  id: number;
  userId: number | null;
  status: PersonStatus;
  displayName: string;
  email: string;
  phone: string;
  city: string;
  source: string;
  tags: string[];
  invitedAt: string | null;
  lastContactedAt: string | null;
  outstandingBalanceCents: number;
  invitation: {
    invitationId: number;
    invitationStatus: "active" | "accepted" | "revoked" | "expired";
    invitationCreatedAt: string;
  } | null;
  createdAt: string;
};

type PageInfo = {
  nextCursor: string | null;
  hasNextPage: boolean;
  limit: number;
};

type ListResponse = { items: PersonRow[]; pageInfo: PageInfo };

const STATUS_OPTIONS: PersonStatus[] = [
  "lead",
  "invited",
  "visitor",
  "guest",
  "member",
  "admin",
  "super_admin",
  "inactive",
];

const STATUS_TONES: Record<PersonStatus, BadgeTone> = {
  lead: "neutral",
  invited: "info",
  visitor: "neutral",
  guest: "neutral",
  member: "success",
  admin: "accent",
  super_admin: "accent",
  inactive: "warning",
};

const dollars = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

function buildQuery(params: {
  q: string;
  status: string;
  tag: string;
  invited: string;
  dues: string;
  cursor?: string | null;
}) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.status) sp.set("status", params.status);
  if (params.tag) sp.set("tag", params.tag);
  if (params.invited) sp.set("invited", params.invited);
  if (params.dues) sp.set("dues", params.dues);
  sp.set("limit", "50");
  if (params.cursor) sp.set("cursor", params.cursor);
  return sp.toString();
}

export default function AdminPeoplePage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | PersonStatus>("");
  const [tag, setTag] = useState("");
  const [invited, setInvited] = useState<"" | "yes" | "no">("");
  const [dues, setDues] = useState<"" | "open" | "overdue">("");
  const [appendedItems, setAppendedItems] = useState<PersonRow[]>([]);
  const [appendCursor, setAppendCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const filters = { q, status, tag, invited, dues };

  const resource = useResource<ListResponse>(
    (signal) => fetchJson<ListResponse>(`/api/admin/people?${buildQuery(filters)}`, { signal }),
    [q, status, tag, invited, dues],
  );

  const baseItems = resource.data?.items ?? [];
  const items = useMemo(() => {
    const seen = new Set<number>();
    const merged: PersonRow[] = [];
    for (const row of [...baseItems, ...appendedItems]) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      merged.push(row);
    }
    return merged;
  }, [baseItems, appendedItems]);

  const pageInfo = appendCursor === null ? resource.data?.pageInfo ?? null : { hasNextPage: !!appendCursor, nextCursor: appendCursor, limit: 50 };

  async function loadMore() {
    const cursor = pageInfo?.nextCursor;
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const next = await fetchJson<ListResponse>(`/api/admin/people?${buildQuery({ ...filters, cursor })}`);
      setAppendedItems((prev) => [...prev, ...next.items]);
      setAppendCursor(next.pageInfo.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  function resetFilters() {
    setQ("");
    setStatus("");
    setTag("");
    setInvited("");
    setDues("");
    setAppendedItems([]);
    setAppendCursor(null);
  }

  const columns: DataTableColumn<PersonRow>[] = [
    {
      id: "name",
      header: "Name",
      accessor: (p) => (
        <Link
          href={`/admin/people/${p.id}`}
          style={{ color: "var(--bk-accent-strong)", fontWeight: 700, textDecoration: "none" }}
        >
          {p.displayName}
        </Link>
      ),
      sortValue: (p) => p.displayName.toLowerCase(),
      exportValue: (p) => p.displayName,
    },
    {
      id: "email",
      header: "Email",
      accessor: (p) => p.email,
      sortValue: (p) => p.email.toLowerCase(),
      exportValue: (p) => p.email,
    },
    {
      id: "status",
      header: "Status",
      accessor: (p) => <Badge tone={STATUS_TONES[p.status] ?? "neutral"}>{p.status}</Badge>,
      sortValue: (p) => p.status,
      exportValue: (p) => p.status,
    },
    {
      id: "phone",
      header: "Phone",
      accessor: (p) => p.phone || "—",
      exportValue: (p) => p.phone,
      hideOnMobile: true,
    },
    {
      id: "city",
      header: "City",
      accessor: (p) => p.city || "—",
      exportValue: (p) => p.city,
      hideOnMobile: true,
    },
    {
      id: "tags",
      header: "Tags",
      accessor: (p) =>
        p.tags.length === 0 ? (
          "—"
        ) : (
          <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
            {p.tags.slice(0, 3).map((t) => (
              <Badge key={t} tone="neutral">{t}</Badge>
            ))}
            {p.tags.length > 3 ? <span style={{ color: "var(--bk-text-muted)" }}>+{p.tags.length - 3}</span> : null}
          </span>
        ),
      exportValue: (p) => p.tags.join("|"),
      hideOnMobile: true,
    },
    {
      id: "balance",
      header: "Open dues",
      accessor: (p) =>
        p.outstandingBalanceCents > 0 ? (
          <span style={{ color: "var(--bk-danger)", fontWeight: 700 }}>{dollars(p.outstandingBalanceCents)}</span>
        ) : (
          "—"
        ),
      sortValue: (p) => p.outstandingBalanceCents,
      exportValue: (p) => (p.outstandingBalanceCents / 100).toFixed(2),
      align: "right",
    },
    {
      id: "invitation",
      header: "Invite",
      accessor: (p) =>
        p.invitation ? <Badge tone={p.invitation.invitationStatus === "active" ? "info" : "neutral"}>{p.invitation.invitationStatus}</Badge> : "—",
      exportValue: (p) => p.invitation?.invitationStatus ?? "",
      hideOnMobile: true,
    },
    {
      id: "createdAt",
      header: "Added",
      accessor: (p) => new Date(p.createdAt).toLocaleDateString(),
      sortValue: (p) => p.createdAt,
      exportValue: (p) => p.createdAt,
      hideOnMobile: true,
    },
  ];

  const summaryStats = useMemo(() => {
    const totalOpen = items.reduce((sum, p) => sum + p.outstandingBalanceCents, 0);
    const activeInvites = items.filter((p) => p.invitation?.invitationStatus === "active").length;
    return [
      { label: "Loaded", value: String(items.length), hint: pageInfo?.hasNextPage ? "More available — load to see all" : "All matching records" },
      { label: "Active invites", value: String(activeInvites), hint: "Loaded rows with open invitations" },
      { label: "Open dues", value: dollars(totalOpen), hint: "Sum across loaded rows" },
    ];
  }, [items, pageInfo?.hasNextPage]);

  return (
    <AdminShell
      currentPath="/admin/people"
      title="People"
      description="Search leads and members, manage tags and outreach, and create new records."
      stats={summaryStats}
      actions={<Button onClick={() => setShowCreate(true)}>+ New person</Button>}
    >
      <Toolbar>
        <ToolbarSearch
          value={q}
          onChange={(next) => {
            setAppendedItems([]);
            setAppendCursor(null);
            setQ(next);
          }}
          placeholder="Search name, email, phone, notes…"
        />
        <ToolbarFilters>
          <Select
            value={status}
            onChange={(e) => {
              setAppendedItems([]);
              setAppendCursor(null);
              setStatus(e.target.value as PersonStatus | "");
            }}
            style={{ minWidth: 140 }}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Input
            value={tag}
            onChange={(e) => {
              setAppendedItems([]);
              setAppendCursor(null);
              setTag(e.target.value);
            }}
            placeholder="Tag…"
            style={{ width: 140 }}
          />
          <Select
            value={invited}
            onChange={(e) => {
              setAppendedItems([]);
              setAppendCursor(null);
              setInvited(e.target.value as "" | "yes" | "no");
            }}
            style={{ minWidth: 130 }}
          >
            <option value="">Any invite</option>
            <option value="yes">Invited</option>
            <option value="no">Not invited</option>
          </Select>
          <Select
            value={dues}
            onChange={(e) => {
              setAppendedItems([]);
              setAppendCursor(null);
              setDues(e.target.value as "" | "open" | "overdue");
            }}
            style={{ minWidth: 130 }}
          >
            <option value="">Any dues</option>
            <option value="open">Has open</option>
            <option value="overdue">Has overdue</option>
          </Select>
          {(q || status || tag || invited || dues) ? (
            <FilterChip label="Clear filters" onRemove={resetFilters} />
          ) : null}
        </ToolbarFilters>
        <ToolbarActions>
          <Button variant="ghost" size="sm" onClick={() => void resource.refresh()}>
            Refresh
          </Button>
        </ToolbarActions>
      </Toolbar>

      <DataState resource={resource} empty={{ title: "No people found", description: "Adjust filters or add a new person to get started.", actions: <Button onClick={() => setShowCreate(true)}>+ New person</Button> }}>
        {() => (
          <DataTable<PersonRow>
            rows={items}
            rowId={(p) => p.id}
            columns={columns}
            selectable
            exportFilename="people.csv"
            emptyState="No matching people"
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
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create person"
        description="Add a new lead or member to the CRM. Use the detail page for advanced fields."
      >
        <CreatePersonForm onCreated={() => { setShowCreate(false); void resource.refresh(); }} />
      </Modal>
    </AdminShell>
  );
}

function CreatePersonForm({ onCreated }: { onCreated: () => void }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [tags, setTags] = useState("");
  const [statusValue, setStatusValue] = useState<PersonStatus>("lead");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await fetchJson("/api/admin/people", {
        method: "POST",
        body: JSON.stringify({
          displayName,
          email,
          phone,
          city,
          status: statusValue,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create person");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "var(--bk-space-3)" }}>
      <Field label="Display name" required>
        {(props) => <Input {...props} value={displayName} onChange={(e) => setDisplayName(e.target.value)} required minLength={2} maxLength={160} />}
      </Field>
      <Field label="Email" required>
        {(props) => <Input {...props} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} />}
      </Field>
      <Field label="Phone">{(props) => <Input {...props} value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={60} />}</Field>
      <Field label="City">{(props) => <Input {...props} value={city} onChange={(e) => setCity(e.target.value)} maxLength={120} />}</Field>
      <Field label="Tags" hint="Comma-separated">
        {(props) => <Input {...props} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="donor, board, follow-up" />}
      </Field>
      <Field label="Status">
        {(props) => (
          <Select {...props} value={statusValue} onChange={(e) => setStatusValue(e.target.value as PersonStatus)}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        )}
      </Field>
      {error ? <p style={{ color: "var(--bk-danger)", margin: 0, fontSize: "var(--bk-text-sm)" }}>{error}</p> : null}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--bk-space-2)" }}>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create person"}
        </Button>
      </div>
    </form>
  );
}
