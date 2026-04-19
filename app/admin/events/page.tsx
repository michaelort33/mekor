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
import { Select } from "@/components/backend/ui/field";
import {
  FilterChip,
  Toolbar,
  ToolbarActions,
  ToolbarFilters,
  ToolbarSearch,
} from "@/components/backend/ui/toolbar";

type RegistrationStatus = "registered" | "waitlisted" | "cancelled" | "payment_pending";

type RegistrationRow = {
  id: number;
  eventId: number;
  eventTitle: string;
  eventPath: string;
  userId: number;
  userEmail: string;
  userDisplayName: string;
  status: RegistrationStatus;
  registeredAt: string;
  paymentDueAt: string | null;
  ticketTierName: string | null;
  receiptUrl: string | null;
  updatedAt: string;
};

type PageInfo = { nextCursor: string | null; hasNextPage: boolean; limit: number };
type ListResponse = { items: RegistrationRow[]; pageInfo: PageInfo };

const STATUS_TONES: Record<RegistrationStatus, BadgeTone> = {
  registered: "success",
  waitlisted: "warning",
  cancelled: "neutral",
  payment_pending: "info",
};

function buildQuery(p: { status: string; eventId: string; cursor?: string | null }) {
  const sp = new URLSearchParams();
  if (p.status) sp.set("status", p.status);
  if (p.eventId) sp.set("eventId", p.eventId);
  sp.set("limit", "50");
  if (p.cursor) sp.set("cursor", p.cursor);
  return sp.toString();
}

export default function AdminEventsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | RegistrationStatus>("");
  const [eventId, setEventId] = useState("");
  const [appended, setAppended] = useState<RegistrationRow[]>([]);
  const [appendCursor, setAppendCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const resource = useResource<ListResponse>(
    (signal) =>
      fetchJson<ListResponse>(`/api/admin/events/registrations?${buildQuery({ status, eventId })}`, { signal }),
    [status, eventId],
  );

  const baseItems = resource.data?.items ?? [];
  const items = useMemo(() => {
    const seen = new Set<number>();
    const merged: RegistrationRow[] = [];
    for (const r of [...baseItems, ...appended]) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      merged.push(r);
    }
    if (!q) return merged;
    const needle = q.toLowerCase();
    return merged.filter(
      (r) =>
        r.eventTitle.toLowerCase().includes(needle) ||
        r.userEmail.toLowerCase().includes(needle) ||
        r.userDisplayName.toLowerCase().includes(needle),
    );
  }, [baseItems, appended, q]);

  const pageInfo =
    appendCursor === null
      ? resource.data?.pageInfo ?? null
      : { hasNextPage: !!appendCursor, nextCursor: appendCursor, limit: 50 };

  async function loadMore() {
    const cursor = pageInfo?.nextCursor;
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const next = await fetchJson<ListResponse>(
        `/api/admin/events/registrations?${buildQuery({ status, eventId, cursor })}`,
      );
      setAppended((prev) => [...prev, ...next.items]);
      setAppendCursor(next.pageInfo.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  function resetFilters() {
    setQ("");
    setStatus("");
    setEventId("");
    setAppended([]);
    setAppendCursor(null);
  }

  const stats = useMemo(() => {
    const registered = items.filter((r) => r.status === "registered").length;
    const waitlist = items.filter((r) => r.status === "waitlisted").length;
    const pending = items.filter((r) => r.status === "payment_pending").length;
    return [
      { label: "Loaded", value: String(items.length), hint: pageInfo?.hasNextPage ? "More available" : "All matches" },
      { label: "Registered", value: String(registered), hint: `${waitlist} waitlisted` },
      { label: "Payment pending", value: String(pending), hint: "Awaiting payment" },
    ];
  }, [items, pageInfo?.hasNextPage]);

  const columns: DataTableColumn<RegistrationRow>[] = [
    {
      id: "event",
      header: "Event",
      accessor: (r) => (
        <div>
          <div style={{ fontWeight: 700 }}>{r.eventTitle}</div>
          <div style={{ fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)" }}>{r.eventPath}</div>
        </div>
      ),
      sortValue: (r) => r.eventTitle,
      exportValue: (r) => r.eventTitle,
    },
    {
      id: "attendee",
      header: "Attendee",
      accessor: (r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.userDisplayName}</div>
          <div style={{ fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)" }}>{r.userEmail}</div>
        </div>
      ),
      sortValue: (r) => r.userDisplayName,
      exportValue: (r) => `${r.userDisplayName} <${r.userEmail}>`,
    },
    {
      id: "tier",
      header: "Tier",
      accessor: (r) => r.ticketTierName ?? "—",
      exportValue: (r) => r.ticketTierName ?? "",
      hideOnMobile: true,
    },
    {
      id: "status",
      header: "Status",
      accessor: (r) => <Badge tone={STATUS_TONES[r.status]}>{r.status.replace("_", " ")}</Badge>,
      sortValue: (r) => r.status,
      exportValue: (r) => r.status,
    },
    {
      id: "registered",
      header: "Registered",
      accessor: (r) => new Date(r.registeredAt).toLocaleString(),
      sortValue: (r) => r.registeredAt,
      exportValue: (r) => r.registeredAt,
      hideOnMobile: true,
    },
  ];

  return (
    <AdminShell
      currentPath="/admin/events"
      title="Event registrations"
      description="Review who's registered, who's waitlisted, and outstanding payment holds."
      stats={stats}
    >
      <Toolbar>
        <ToolbarSearch value={q} onChange={setQ} placeholder="Search event, attendee, or email…" />
        <ToolbarFilters>
          <Select value={status} onChange={(e) => setStatus(e.target.value as RegistrationStatus | "")} style={{ minWidth: 160 }}>
            <option value="">All statuses</option>
            <option value="registered">Registered</option>
            <option value="waitlisted">Waitlisted</option>
            <option value="payment_pending">Payment pending</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          {(q || status || eventId) ? <FilterChip label="Clear filters" onRemove={resetFilters} /> : null}
        </ToolbarFilters>
        <ToolbarActions>
          <Button variant="ghost" size="sm" onClick={() => void resource.refresh()}>
            Refresh
          </Button>
        </ToolbarActions>
      </Toolbar>

      <DataState resource={resource} empty={{ title: "No registrations", description: "No one has registered for the current filters." }}>
        {() => (
          <DataTable<RegistrationRow>
            rows={items}
            rowId={(r) => r.id}
            columns={columns}
            exportFilename="event-registrations.csv"
            emptyState="No registrations match"
            pagination={{
              pageSize: 50,
              totalLoaded: items.length,
              hasMore: !!pageInfo?.hasNextPage,
              onLoadMore: () => void loadMore(),
            }}
          />
        )}
      </DataState>
    </AdminShell>
  );
}
