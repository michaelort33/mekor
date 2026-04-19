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

type Direction = "inbound" | "outbound";
type MessageSource = "manual" | "newsletter" | "automated" | "dues" | "form_submission" | "mailchimp_signup";

type MessageRow = {
  id: string;
  direction: Direction;
  source: MessageSource;
  channel: string;
  status: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  provider: string;
  providerMessageId: string;
  errorMessage: string;
  createdAt: string;
  sentAt: string | null;
  actorEmail: string;
  campaignName: string;
  segmentLabel: string;
  category: string;
  summary: string;
};

type Segment = { key: string; label: string };
type PageInfo = { nextCursor: string | null; hasNextPage: boolean; limit: number };

type ListResponse = { items: MessageRow[]; pageInfo: PageInfo; segments: Segment[] };

const STATUS_TONES: Record<string, BadgeTone> = {
  new: "info",
  read: "neutral",
  archived: "neutral",
  sent: "success",
  failed: "danger",
  skipped: "warning",
};

const SOURCE_TONES: Record<MessageSource, BadgeTone> = {
  manual: "accent",
  newsletter: "info",
  automated: "neutral",
  dues: "warning",
  form_submission: "info",
  mailchimp_signup: "info",
};

function buildQuery(p: { q: string; direction: string; source: string; status: string; cursor?: string | null }) {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.direction) sp.set("direction", p.direction);
  if (p.source) sp.set("source", p.source);
  if (p.status) sp.set("status", p.status);
  sp.set("limit", "50");
  if (p.cursor) sp.set("cursor", p.cursor);
  return sp.toString();
}

export default function AdminMessagesPage() {
  const [q, setQ] = useState("");
  const [direction, setDirection] = useState<"" | Direction>("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [appended, setAppended] = useState<MessageRow[]>([]);
  const [appendCursor, setAppendCursor] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const resource = useResource<ListResponse>(
    (signal) =>
      fetchJson<ListResponse>(`/api/admin/messages?${buildQuery({ q, direction, source, status })}`, { signal }),
    [q, direction, source, status],
  );

  const baseItems = resource.data?.items ?? [];
  const segments = resource.data?.segments ?? [];

  const items = useMemo(() => {
    const seen = new Set<string>();
    const out: MessageRow[] = [];
    for (const m of [...baseItems, ...appended]) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      out.push(m);
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
        `/api/admin/messages?${buildQuery({ q, direction, source, status, cursor })}`,
      );
      setAppended((prev) => [...prev, ...next.items]);
      setAppendCursor(next.pageInfo.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  function resetFilters() {
    setQ("");
    setDirection("");
    setSource("");
    setStatus("");
    setAppended([]);
    setAppendCursor(null);
  }

  const columns: DataTableColumn<MessageRow>[] = [
    {
      id: "when",
      header: "When",
      accessor: (m) => new Date(m.createdAt).toLocaleString(),
      sortValue: (m) => m.createdAt,
      exportValue: (m) => m.createdAt,
    },
    {
      id: "direction",
      header: "Dir",
      accessor: (m) => (m.direction === "inbound" ? "←" : "→"),
      exportValue: (m) => m.direction,
    },
    {
      id: "source",
      header: "Source",
      accessor: (m) => <Badge tone={SOURCE_TONES[m.source] ?? "neutral"}>{m.source}</Badge>,
      exportValue: (m) => m.source,
    },
    {
      id: "recipient",
      header: "Recipient",
      accessor: (m) => (
        <div>
          <div style={{ fontWeight: 600 }}>{m.recipientName || "—"}</div>
          <div style={{ fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)" }}>{m.recipientEmail}</div>
        </div>
      ),
      exportValue: (m) => `${m.recipientName} <${m.recipientEmail}>`,
    },
    {
      id: "subject",
      header: "Subject",
      accessor: (m) => m.subject,
      exportValue: (m) => m.subject,
    },
    {
      id: "status",
      header: "Status",
      accessor: (m) => <Badge tone={STATUS_TONES[m.status] ?? "neutral"}>{m.status}</Badge>,
      exportValue: (m) => m.status,
    },
    {
      id: "actor",
      header: "Actor",
      accessor: (m) => m.actorEmail,
      exportValue: (m) => m.actorEmail,
      hideOnMobile: true,
    },
  ];

  const stats = useMemo(() => {
    const sent = items.filter((m) => m.status === "sent").length;
    const failed = items.filter((m) => m.status === "failed").length;
    const inbound = items.filter((m) => m.direction === "inbound").length;
    return [
      { label: "Loaded messages", value: String(items.length), hint: pageInfo?.hasNextPage ? "More available" : "All matches" },
      { label: "Delivered", value: String(sent), hint: `${failed} failed` },
      { label: "Inbound", value: String(inbound), hint: "From forms & signups" },
    ];
  }, [items, pageInfo?.hasNextPage]);

  return (
    <AdminShell
      currentPath="/admin/messages"
      title="Messages"
      description="Unified inbound/outbound log across manual campaigns, newsletters, automated mail, and dues notifications."
      stats={stats}
    >
      <Toolbar>
        <ToolbarSearch value={q} onChange={setQ} placeholder="Search subject, recipient, sender…" />
        <ToolbarFilters>
          <Select value={direction} onChange={(e) => setDirection(e.target.value as "" | Direction)} style={{ minWidth: 130 }}>
            <option value="">All directions</option>
            <option value="outbound">Outbound</option>
            <option value="inbound">Inbound</option>
          </Select>
          <Select value={source} onChange={(e) => setSource(e.target.value)} style={{ minWidth: 150 }}>
            <option value="">All sources</option>
            <option value="manual">Manual</option>
            <option value="newsletter">Newsletter</option>
            <option value="automated">Automated</option>
            <option value="dues">Dues</option>
            <option value="form_submission">Form submit</option>
            <option value="mailchimp_signup">Mailchimp</option>
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} style={{ minWidth: 140 }}>
            <option value="">Any status</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="archived">Archived</option>
          </Select>
          {(q || direction || source || status) ? <FilterChip label="Clear filters" onRemove={resetFilters} /> : null}
        </ToolbarFilters>
        <ToolbarActions>
          <Button variant="ghost" size="sm" onClick={() => void resource.refresh()}>
            Refresh
          </Button>
          <Button size="sm" onClick={() => setComposing(true)}>
            Compose campaign
          </Button>
        </ToolbarActions>
      </Toolbar>

      <DataState resource={resource} empty={{ title: "No messages", description: "Adjust filters to widen results." }}>
        {() => (
          <DataTable<MessageRow>
            rows={items}
            rowId={(m) => m.id}
            columns={columns}
            exportFilename="messages.csv"
            emptyState="No matching messages"
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
        open={composing}
        onClose={() => setComposing(false)}
        title="Compose campaign"
        description="Send a one-off email to a saved segment."
        size="lg"
      >
        <ComposeForm
          segments={segments}
          onSaved={() => {
            setComposing(false);
            void resource.refresh();
          }}
        />
      </Modal>
    </AdminShell>
  );
}

function ComposeForm({ segments, onSaved }: { segments: Segment[]; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [segmentKey, setSegmentKey] = useState(segments[0]?.key ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [previewInfo, setPreviewInfo] = useState<{ recipientCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(mode: "preview" | "send") {
    setSubmitting(true);
    setError(null);
    try {
      const result = await fetchJson<{ recipientCount: number; campaignId?: number }>(`/api/admin/messages`, {
        method: "POST",
        body: JSON.stringify({
          mode,
          channel: "email",
          name: name || undefined,
          subject,
          body,
          segmentKey: segmentKey || undefined,
        }),
      });
      if (mode === "preview") {
        setPreviewInfo({ recipientCount: result.recipientCount });
      } else {
        onSaved();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--bk-space-3)" }}>
      <Field label="Campaign name" hint="Optional label for your records">
        {(props) => <Input {...props} value={name} onChange={(e) => setName(e.target.value)} />}
      </Field>
      <Field label="Segment">
        {(props) => (
          <Select {...props} value={segmentKey} onChange={(e) => setSegmentKey(e.target.value)}>
            {segments.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Subject" required>
        {(props) => <Input {...props} value={subject} onChange={(e) => setSubject(e.target.value)} />}
      </Field>
      <Field label="Body" required hint="HTML allowed">
        {(props) => (
          <textarea
            id={props.id}
            aria-invalid={props["aria-invalid"]}
            aria-describedby={props["aria-describedby"]}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            style={{
              width: "100%",
              fontFamily: "inherit",
              fontSize: "var(--bk-text-sm)",
              padding: "var(--bk-space-2)",
              background: "var(--bk-surface)",
              border: "1px solid var(--bk-border)",
              borderRadius: "var(--bk-radius-sm)",
              color: "var(--bk-text)",
            }}
          />
        )}
      </Field>
      {previewInfo ? (
        <div style={{ background: "var(--bk-surface-soft)", padding: "var(--bk-space-3)", borderRadius: "var(--bk-radius-md)" }}>
          Preview ready: <strong>{previewInfo.recipientCount}</strong> recipients would receive this campaign.
        </div>
      ) : null}
      {error ? <p style={{ color: "var(--bk-danger)", margin: 0 }}>{error}</p> : null}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--bk-space-2)" }}>
        <Button type="button" variant="ghost" onClick={() => void submit("preview")} disabled={submitting}>
          Preview
        </Button>
        <Button type="button" onClick={() => void submit("send")} disabled={submitting || !subject || !body}>
          {submitting ? "Sending…" : "Send now"}
        </Button>
      </div>
    </div>
  );
}
