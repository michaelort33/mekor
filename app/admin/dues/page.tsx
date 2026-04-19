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

type InvoiceStatus = "open" | "paid" | "void" | "overdue";

type InvoiceRow = {
  id: number;
  userId: number;
  userEmail: string;
  userDisplayName: string;
  label: string;
  amountCents: number;
  currency: string;
  dueDate: string;
  status: InvoiceStatus;
  paidAt: string | null;
  stripeReceiptUrl: string | null;
  updatedAt: string;
  reminderCount: number;
  lastReminderSentAt: string | null;
};

type ScheduleRow = {
  id: number;
  userId: number;
  userEmail: string;
  userDisplayName: string;
  frequency: "annual" | "monthly" | "custom";
  amountCents: number;
  currency: string;
  nextDueDate: string;
  active: boolean;
  notes: string;
  updatedAt: string;
};

type PageInfo = { nextCursor: string | null; hasNextPage: boolean; limit: number };
type InvoiceListResponse = { items: InvoiceRow[]; pageInfo: PageInfo };
type ScheduleListResponse = { items: ScheduleRow[]; pageInfo: PageInfo };

const STATUS_TONES: Record<InvoiceStatus, BadgeTone> = {
  open: "info",
  paid: "success",
  void: "neutral",
  overdue: "danger",
};

const dollars = (cents: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: (currency || "USD").toUpperCase() }).format(cents / 100);

function buildInvoiceQuery(p: { status: string; cursor?: string | null }) {
  const sp = new URLSearchParams();
  if (p.status) sp.set("status", p.status);
  sp.set("limit", "50");
  if (p.cursor) sp.set("cursor", p.cursor);
  return sp.toString();
}

export default function AdminDuesPage() {
  const [tab, setTab] = useState<"invoices" | "schedules">("invoices");

  return (
    <AdminShell
      currentPath="/admin/dues"
      title="Dues"
      description="Manage member invoices, payment schedules, and overdue actions."
    >
      <div style={{ display: "flex", gap: "var(--bk-space-2)", borderBottom: "1px solid var(--bk-border)" }}>
        <TabButton active={tab === "invoices"} onClick={() => setTab("invoices")} label="Invoices" />
        <TabButton active={tab === "schedules"} onClick={() => setTab("schedules")} label="Schedules" />
      </div>

      {tab === "invoices" ? <InvoicesPanel /> : <SchedulesPanel />}
    </AdminShell>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "var(--bk-space-2) var(--bk-space-3)",
        background: "transparent",
        border: "none",
        borderBottom: active ? "2px solid var(--bk-accent-strong)" : "2px solid transparent",
        color: active ? "var(--bk-text)" : "var(--bk-text-soft)",
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function InvoicesPanel() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | InvoiceStatus>("");
  const [appended, setAppended] = useState<InvoiceRow[]>([]);
  const [appendCursor, setAppendCursor] = useState<string | null>(null);
  const [editing, setEditing] = useState<InvoiceRow | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const resource = useResource<InvoiceListResponse>(
    (signal) =>
      fetchJson<InvoiceListResponse>(`/api/admin/dues/invoices?${buildInvoiceQuery({ status })}`, { signal }),
    [status],
  );

  const baseItems = resource.data?.items ?? [];
  const items = useMemo(() => {
    const seen = new Set<number>();
    const out: InvoiceRow[] = [];
    for (const row of [...baseItems, ...appended]) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      out.push(row);
    }
    if (q) {
      const needle = q.toLowerCase();
      return out.filter(
        (r) =>
          r.label.toLowerCase().includes(needle) ||
          r.userEmail.toLowerCase().includes(needle) ||
          r.userDisplayName.toLowerCase().includes(needle),
      );
    }
    return out;
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
      const next = await fetchJson<InvoiceListResponse>(
        `/api/admin/dues/invoices?${buildInvoiceQuery({ status, cursor })}`,
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
    setAppended([]);
    setAppendCursor(null);
  }

  const stats = useMemo(() => {
    const open = items.filter((i) => i.status === "open" || i.status === "overdue");
    const overdue = items.filter((i) => i.status === "overdue");
    const openCents = open.reduce((s, i) => s + i.amountCents, 0);
    return { openCount: open.length, overdueCount: overdue.length, openCents };
  }, [items]);

  const columns: DataTableColumn<InvoiceRow>[] = [
    {
      id: "user",
      header: "Member",
      accessor: (r) => (
        <div>
          <div style={{ fontWeight: 700 }}>{r.userDisplayName || "—"}</div>
          <div style={{ fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)" }}>{r.userEmail}</div>
        </div>
      ),
      sortValue: (r) => r.userDisplayName.toLowerCase(),
      exportValue: (r) => `${r.userDisplayName} <${r.userEmail}>`,
    },
    {
      id: "label",
      header: "Invoice",
      accessor: (r) => r.label,
      sortValue: (r) => r.label,
      exportValue: (r) => r.label,
    },
    {
      id: "amount",
      header: "Amount",
      accessor: (r) => <strong>{dollars(r.amountCents, r.currency)}</strong>,
      sortValue: (r) => r.amountCents,
      exportValue: (r) => (r.amountCents / 100).toFixed(2),
      align: "right",
    },
    {
      id: "due",
      header: "Due",
      accessor: (r) => r.dueDate,
      sortValue: (r) => r.dueDate,
      exportValue: (r) => r.dueDate,
    },
    {
      id: "status",
      header: "Status",
      accessor: (r) => <Badge tone={STATUS_TONES[r.status]}>{r.status}</Badge>,
      sortValue: (r) => r.status,
      exportValue: (r) => r.status,
    },
    {
      id: "reminders",
      header: "Reminders",
      accessor: (r) =>
        r.reminderCount > 0 ? (
          <span title={r.lastReminderSentAt ?? undefined}>{r.reminderCount} sent</span>
        ) : (
          "—"
        ),
      exportValue: (r) => String(r.reminderCount),
      hideOnMobile: true,
    },
  ];

  return (
    <>
      <Toolbar>
        <ToolbarSearch value={q} onChange={setQ} placeholder="Search member or invoice label…" />
        <ToolbarFilters>
          <Select
            value={status}
            onChange={(e) => {
              setAppended([]);
              setAppendCursor(null);
              setStatus(e.target.value as InvoiceStatus | "");
            }}
            style={{ minWidth: 160 }}
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="overdue">Overdue</option>
            <option value="paid">Paid</option>
            <option value="void">Void</option>
          </Select>
          {(q || status) ? <FilterChip label="Clear filters" onRemove={resetFilters} /> : null}
        </ToolbarFilters>
        <ToolbarActions>
          <Button variant="ghost" size="sm" onClick={() => void resource.refresh()}>
            Refresh
          </Button>
        </ToolbarActions>
      </Toolbar>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "var(--bk-space-3)",
          margin: "var(--bk-space-3) 0",
        }}
      >
        <StatCard label="Open invoices" value={String(stats.openCount)} hint="Includes overdue" />
        <StatCard label="Overdue" value={String(stats.overdueCount)} hint="Needs follow-up" tone="danger" />
        <StatCard label="Open balance" value={dollars(stats.openCents)} hint="Across loaded rows" />
      </div>

      <DataState resource={resource} empty={{ title: "No invoices", description: "Adjust filters or generate dues." }}>
        {() => (
          <DataTable<InvoiceRow>
            rows={items}
            rowId={(r) => r.id}
            columns={columns}
            rowActions={(r) => (
              <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
                Edit
              </Button>
            )}
            exportFilename="dues-invoices.csv"
            emptyState="No matching invoices"
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
        title={editing ? `Edit ${editing.label}` : "Edit invoice"}
        description="Adjust label, amount, due date, or status. Marking as paid records a manual payment."
        size="lg"
      >
        {editing ? (
          <EditInvoiceForm
            invoice={editing}
            onSaved={() => {
              setEditing(null);
              void resource.refresh();
            }}
          />
        ) : null}
      </Modal>
    </>
  );
}

function EditInvoiceForm({ invoice, onSaved }: { invoice: InvoiceRow; onSaved: () => void }) {
  const [label, setLabel] = useState(invoice.label);
  const [amount, setAmount] = useState((invoice.amountCents / 100).toString());
  const [dueDate, setDueDate] = useState(invoice.dueDate);
  const [status, setStatus] = useState<InvoiceStatus>(invoice.status);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const cents = Math.round(Number(amount) * 100);
      if (!Number.isFinite(cents) || cents < 1) throw new Error("Amount must be > 0");
      await fetchJson(`/api/admin/dues/invoices`, {
        method: "PUT",
        body: JSON.stringify({ id: invoice.id, label, amountCents: cents, dueDate, status }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update invoice");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "var(--bk-space-3)" }}>
      <Field label="Label">
        {(props) => <Input {...props} value={label} onChange={(e) => setLabel(e.target.value)} />}
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--bk-space-3)" }}>
        <Field label="Amount (USD)" required>
          {(props) => <Input {...props} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />}
        </Field>
        <Field label="Due date">
          {(props) => <Input {...props} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />}
        </Field>
      </div>
      <Field label="Status">
        {(props) => (
          <Select {...props} value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)}>
            <option value="open">Open</option>
            <option value="overdue">Overdue</option>
            <option value="paid">Paid</option>
            <option value="void">Void</option>
          </Select>
        )}
      </Field>
      {error ? <p style={{ color: "var(--bk-danger)", margin: 0, fontSize: "var(--bk-text-sm)" }}>{error}</p> : null}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--bk-space-2)" }}>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function SchedulesPanel() {
  const [creating, setCreating] = useState(false);

  const resource = useResource<ScheduleListResponse>(
    (signal) => fetchJson<ScheduleListResponse>(`/api/admin/dues/schedules?limit=50`, { signal }),
    [],
  );

  const items = resource.data?.items ?? [];

  const columns: DataTableColumn<ScheduleRow>[] = [
    {
      id: "user",
      header: "Member",
      accessor: (r) => (
        <div>
          <div style={{ fontWeight: 700 }}>{r.userDisplayName || "—"}</div>
          <div style={{ fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)" }}>{r.userEmail}</div>
        </div>
      ),
      sortValue: (r) => r.userDisplayName.toLowerCase(),
      exportValue: (r) => `${r.userDisplayName} <${r.userEmail}>`,
    },
    {
      id: "freq",
      header: "Frequency",
      accessor: (r) => r.frequency,
      sortValue: (r) => r.frequency,
      exportValue: (r) => r.frequency,
    },
    {
      id: "amount",
      header: "Amount",
      accessor: (r) => <strong>{dollars(r.amountCents, r.currency)}</strong>,
      sortValue: (r) => r.amountCents,
      exportValue: (r) => (r.amountCents / 100).toFixed(2),
      align: "right",
    },
    {
      id: "next",
      header: "Next due",
      accessor: (r) => r.nextDueDate,
      sortValue: (r) => r.nextDueDate,
      exportValue: (r) => r.nextDueDate,
    },
    {
      id: "active",
      header: "Active",
      accessor: (r) => (r.active ? <Badge tone="success">active</Badge> : <Badge tone="neutral">paused</Badge>),
      exportValue: (r) => (r.active ? "active" : "paused"),
    },
  ];

  return (
    <>
      <Toolbar>
        <ToolbarActions>
          <Button variant="ghost" size="sm" onClick={() => void resource.refresh()}>
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreating(true)}>
            New schedule
          </Button>
        </ToolbarActions>
      </Toolbar>

      <DataState resource={resource} empty={{ title: "No schedules yet", description: "Create a schedule to start auto-generating invoices." }}>
        {() => (
          <DataTable<ScheduleRow>
            rows={items}
            rowId={(r) => r.id}
            columns={columns}
            exportFilename="dues-schedules.csv"
            emptyState="No matching schedules"
          />
        )}
      </DataState>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Create dues schedule"
        description="Recurring schedule that drives invoice generation."
        size="md"
      >
        <CreateScheduleForm
          onSaved={() => {
            setCreating(false);
            void resource.refresh();
          }}
        />
      </Modal>
    </>
  );
}

function CreateScheduleForm({ onSaved }: { onSaved: () => void }) {
  const [userId, setUserId] = useState("");
  const [frequency, setFrequency] = useState<"annual" | "monthly" | "custom">("annual");
  const [amount, setAmount] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const cents = Math.round(Number(amount) * 100);
      const uid = Number(userId);
      if (!Number.isInteger(uid) || uid < 1) throw new Error("Member ID required");
      if (!Number.isFinite(cents) || cents < 1) throw new Error("Amount must be > 0");
      if (!nextDueDate) throw new Error("Next due date required");
      await fetchJson(`/api/admin/dues/schedules`, {
        method: "POST",
        body: JSON.stringify({ userId: uid, frequency, amountCents: cents, nextDueDate, active, notes }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create schedule");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "var(--bk-space-3)" }}>
      <Field label="Member user ID" required hint="Numeric user ID. Use the Users page to find IDs.">
        {(props) => <Input {...props} inputMode="numeric" value={userId} onChange={(e) => setUserId(e.target.value)} />}
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--bk-space-3)" }}>
        <Field label="Frequency">
          {(props) => (
            <Select {...props} value={frequency} onChange={(e) => setFrequency(e.target.value as typeof frequency)}>
              <option value="annual">Annual</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom</option>
            </Select>
          )}
        </Field>
        <Field label="Amount (USD)" required>
          {(props) => <Input {...props} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />}
        </Field>
      </div>
      <Field label="Next due date" required>
        {(props) => <Input {...props} type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />}
      </Field>
      <Field label="Notes">
        {(props) => <Input {...props} value={notes} onChange={(e) => setNotes(e.target.value)} />}
      </Field>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        <span>Active</span>
      </label>
      {error ? <p style={{ color: "var(--bk-danger)", margin: 0, fontSize: "var(--bk-text-sm)" }}>{error}</p> : null}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--bk-space-2)" }}>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Create schedule"}
        </Button>
      </div>
    </form>
  );
}

function StatCard({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: "danger" }) {
  return (
    <div
      style={{
        background: "var(--bk-surface)",
        border: "1px solid var(--bk-border)",
        borderRadius: "var(--bk-radius-md)",
        padding: "var(--bk-space-3)",
      }}
    >
      <div style={{ fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)", textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: "var(--bk-text-xl)",
          fontWeight: 700,
          color: tone === "danger" ? "var(--bk-danger)" : "var(--bk-text)",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)" }}>{hint}</div>
    </div>
  );
}
