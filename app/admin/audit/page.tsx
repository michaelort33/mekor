"use client";

import { useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { DataState } from "@/components/backend/data/data-state";
import { fetchJson, useResource } from "@/components/backend/data/use-resource";
import { Button } from "@/components/backend/ui/button";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/backend/ui/data-table";
import { Input } from "@/components/backend/ui/field";
import { Modal } from "@/components/backend/ui/modal";
import {
  FilterChip,
  Toolbar,
  ToolbarActions,
  ToolbarFilters,
  ToolbarSearch,
} from "@/components/backend/ui/toolbar";

type AuditRow = {
  id: number;
  actorUserId: number;
  actorEmail: string;
  actorDisplayName: string;
  action: string;
  targetType: string;
  targetId: string;
  payloadJson: Record<string, unknown>;
  createdAt: string;
};

type PageInfo = { nextCursor: string | null; hasNextPage: boolean; limit: number };
type ListResponse = { items: AuditRow[]; pageInfo: PageInfo };

function buildQuery(p: { action: string; targetType: string; actorEmail: string; cursor?: string | null }) {
  const sp = new URLSearchParams();
  if (p.action) sp.set("action", p.action);
  if (p.targetType) sp.set("targetType", p.targetType);
  if (p.actorEmail) sp.set("actorEmail", p.actorEmail);
  sp.set("limit", "50");
  if (p.cursor) sp.set("cursor", p.cursor);
  return sp.toString();
}

export default function AdminAuditPage() {
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [actorEmail, setActorEmail] = useState("");
  const [appended, setAppended] = useState<AuditRow[]>([]);
  const [appendCursor, setAppendCursor] = useState<string | null>(null);
  const [viewing, setViewing] = useState<AuditRow | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const resource = useResource<ListResponse>(
    (signal) =>
      fetchJson<ListResponse>(`/api/admin/audit-log?${buildQuery({ action, targetType, actorEmail })}`, { signal }),
    [action, targetType, actorEmail],
  );

  const baseItems = resource.data?.items ?? [];
  const items = useMemo(() => {
    const seen = new Set<number>();
    const out: AuditRow[] = [];
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
      const next = await fetchJson<ListResponse>(
        `/api/admin/audit-log?${buildQuery({ action, targetType, actorEmail, cursor })}`,
      );
      setAppended((prev) => [...prev, ...next.items]);
      setAppendCursor(next.pageInfo.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  function reset() {
    setAction("");
    setTargetType("");
    setActorEmail("");
    setAppended([]);
    setAppendCursor(null);
  }

  const stats = useMemo(() => {
    const uniqueActors = new Set(items.map((r) => r.actorUserId)).size;
    const uniqueActions = new Set(items.map((r) => r.action)).size;
    return [
      { label: "Loaded events", value: String(items.length), hint: pageInfo?.hasNextPage ? "More available" : "All matches" },
      { label: "Unique actors", value: String(uniqueActors), hint: "In current view" },
      { label: "Unique actions", value: String(uniqueActions), hint: "Action types" },
    ];
  }, [items, pageInfo?.hasNextPage]);

  const columns: DataTableColumn<AuditRow>[] = [
    {
      id: "when",
      header: "When",
      accessor: (r) => new Date(r.createdAt).toLocaleString(),
      sortValue: (r) => r.createdAt,
      exportValue: (r) => r.createdAt,
    },
    {
      id: "actor",
      header: "Actor",
      accessor: (r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.actorDisplayName || "—"}</div>
          <div style={{ fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)" }}>{r.actorEmail}</div>
        </div>
      ),
      sortValue: (r) => r.actorEmail,
      exportValue: (r) => r.actorEmail,
    },
    {
      id: "action",
      header: "Action",
      accessor: (r) => <code style={{ fontSize: "var(--bk-text-xs)" }}>{r.action}</code>,
      sortValue: (r) => r.action,
      exportValue: (r) => r.action,
    },
    {
      id: "target",
      header: "Target",
      accessor: (r) => `${r.targetType}:${r.targetId}`,
      exportValue: (r) => `${r.targetType}:${r.targetId}`,
    },
  ];

  return (
    <AdminShell
      currentPath="/admin/audit"
      title="Audit log"
      description="Every audited admin action across roles, dues, payments, applications, and messaging."
      stats={stats}
    >
      <Toolbar>
        <ToolbarSearch value={action} onChange={setAction} placeholder="Filter by action (e.g. user.role)…" />
        <ToolbarFilters>
          <Input
            placeholder="Target type (user, payment…)"
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            style={{ width: 200 }}
          />
          <Input
            placeholder="Actor email"
            value={actorEmail}
            onChange={(e) => setActorEmail(e.target.value)}
            style={{ width: 200 }}
          />
          {(action || targetType || actorEmail) ? <FilterChip label="Clear filters" onRemove={reset} /> : null}
        </ToolbarFilters>
        <ToolbarActions>
          <Button variant="ghost" size="sm" onClick={() => void resource.refresh()}>
            Refresh
          </Button>
        </ToolbarActions>
      </Toolbar>

      <DataState resource={resource} empty={{ title: "No audit events", description: "No events match your filters." }}>
        {() => (
          <DataTable<AuditRow>
            rows={items}
            rowId={(r) => r.id}
            columns={columns}
            rowActions={(r) => (
              <Button size="sm" variant="ghost" onClick={() => setViewing(r)}>
                View payload
              </Button>
            )}
            exportFilename="admin-audit-log.csv"
            emptyState="No audit events match"
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
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? `${viewing.action} · ${viewing.targetType}:${viewing.targetId}` : "Payload"}
        size="lg"
      >
        {viewing ? (
          <pre
            style={{
              background: "var(--bk-surface-soft)",
              padding: "var(--bk-space-3)",
              borderRadius: "var(--bk-radius-md)",
              fontSize: "var(--bk-text-xs)",
              overflowX: "auto",
              margin: 0,
              maxHeight: 480,
            }}
          >
            {JSON.stringify(viewing.payloadJson, null, 2)}
          </pre>
        ) : null}
      </Modal>
    </AdminShell>
  );
}
