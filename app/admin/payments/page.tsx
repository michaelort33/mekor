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
import { PAYMENT_KIND_OPTIONS, PAYMENT_SOURCE_OPTIONS } from "@/lib/payments/shared";

type ClassificationStatus = "unreconciled" | "auto_matched" | "manually_matched";

type PaymentRow = {
  id: number;
  personId: number | null;
  userId: number | null;
  familyId: number | null;
  campaignId: number | null;
  source: string;
  status: string;
  kind: string;
  classificationStatus: ClassificationStatus;
  taxDeductibility: string;
  amountCents: number;
  deductibleAmountCents: number;
  goodsServicesValueCents: number;
  currency: string;
  designation: string;
  payerDisplayName: string;
  payerEmail: string;
  payerPhone: string;
  paidAt: string;
  receiptNumber: string | null;
  personDisplayName: string | null;
  personStatus: string | null;
  userDisplayName: string | null;
  campaignTitle: string | null;
};

type Stats = {
  totalCount: number;
  unreconciledCount: number;
  totalAmountCents: number;
  deductibleAmountCents: number;
};

type ListResponse = { payments: PaymentRow[]; stats: Stats };

type PersonSearchResult = {
  id: number;
  displayName: string;
  email: string;
  status: string;
};

const CLASSIFICATIONS: { value: "" | ClassificationStatus; label: string }[] = [
  { value: "", label: "All classifications" },
  { value: "unreconciled", label: "Unreconciled" },
  { value: "auto_matched", label: "Auto matched" },
  { value: "manually_matched", label: "Manually matched" },
];

const CLASSIFICATION_TONES: Record<ClassificationStatus, BadgeTone> = {
  unreconciled: "warning",
  auto_matched: "info",
  manually_matched: "success",
};

const STATUS_TONES: Record<string, BadgeTone> = {
  succeeded: "success",
  pending: "warning",
  failed: "danger",
  refunded: "neutral",
};

const dollars = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

function buildQuery(p: { q: string; classificationStatus: string; taxYear: string }) {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.classificationStatus) sp.set("classificationStatus", p.classificationStatus);
  if (p.taxYear) sp.set("taxYear", p.taxYear);
  return sp.toString();
}

export default function AdminPaymentsPage() {
  const [q, setQ] = useState("");
  const [classificationStatus, setClassificationStatus] = useState<"" | ClassificationStatus>("unreconciled");
  const [taxYear, setTaxYear] = useState("");
  const [editing, setEditing] = useState<PaymentRow | null>(null);
  const [creating, setCreating] = useState(false);

  const resource = useResource<ListResponse>(
    (signal) =>
      fetchJson<ListResponse>(`/api/admin/payments?${buildQuery({ q, classificationStatus, taxYear })}`, { signal }),
    [q, classificationStatus, taxYear],
  );

  const items = resource.data?.payments ?? [];
  const stats = resource.data?.stats;

  function resetFilters() {
    setQ("");
    setClassificationStatus("");
    setTaxYear("");
  }

  const columns: DataTableColumn<PaymentRow>[] = [
    {
      id: "paidAt",
      header: "Date",
      accessor: (p) => new Date(p.paidAt).toLocaleDateString(),
      sortValue: (p) => p.paidAt,
      exportValue: (p) => p.paidAt,
    },
    {
      id: "payer",
      header: "Payer",
      accessor: (p) => (
        <div>
          <div style={{ fontWeight: 700 }}>{p.payerDisplayName || "—"}</div>
          {p.personDisplayName && p.personDisplayName !== p.payerDisplayName ? (
            <div style={{ fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)" }}>
              → {p.personDisplayName}
            </div>
          ) : null}
        </div>
      ),
      sortValue: (p) => p.payerDisplayName.toLowerCase(),
      exportValue: (p) => p.payerDisplayName,
    },
    {
      id: "amount",
      header: "Amount",
      accessor: (p) => <strong>{dollars(p.amountCents)}</strong>,
      sortValue: (p) => p.amountCents,
      exportValue: (p) => (p.amountCents / 100).toFixed(2),
      align: "right",
    },
    {
      id: "deductible",
      header: "Deductible",
      accessor: (p) =>
        p.deductibleAmountCents > 0 ? dollars(p.deductibleAmountCents) : <span style={{ color: "var(--bk-text-soft)" }}>—</span>,
      sortValue: (p) => p.deductibleAmountCents,
      exportValue: (p) => (p.deductibleAmountCents / 100).toFixed(2),
      align: "right",
      hideOnMobile: true,
    },
    {
      id: "source",
      header: "Source",
      accessor: (p) => p.source,
      exportValue: (p) => p.source,
      hideOnMobile: true,
    },
    {
      id: "kind",
      header: "Kind",
      accessor: (p) => p.kind,
      exportValue: (p) => p.kind,
      hideOnMobile: true,
    },
    {
      id: "classification",
      header: "Match",
      accessor: (p) => <Badge tone={CLASSIFICATION_TONES[p.classificationStatus]}>{p.classificationStatus.replace("_", " ")}</Badge>,
      sortValue: (p) => p.classificationStatus,
      exportValue: (p) => p.classificationStatus,
    },
    {
      id: "status",
      header: "Status",
      accessor: (p) => <Badge tone={STATUS_TONES[p.status] ?? "neutral"}>{p.status}</Badge>,
      exportValue: (p) => p.status,
      hideOnMobile: true,
    },
    {
      id: "designation",
      header: "Designation",
      accessor: (p) => p.designation,
      exportValue: (p) => p.designation,
      hideOnMobile: true,
    },
  ];

  const tiles = useMemo(() => {
    if (!stats) {
      return [
        { label: "Loaded", value: String(items.length), hint: "Awaiting load" },
      ];
    }
    return [
      { label: "Loaded payments", value: String(stats.totalCount), hint: "Matching filters" },
      { label: "Unreconciled", value: String(stats.unreconciledCount), hint: stats.unreconciledCount > 0 ? "Needs reassignment" : "All matched" },
      { label: "Total amount", value: dollars(stats.totalAmountCents), hint: "Sum across loaded" },
      { label: "Deductible", value: dollars(stats.deductibleAmountCents), hint: "Tax-deductible portion" },
    ];
  }, [stats, items.length]);

  return (
    <AdminShell
      currentPath="/admin/payments"
      title="Payments"
      description="Reconcile multi-source payments, classify donations, and track tax-deductible totals."
      stats={tiles}
    >
      <Toolbar>
        <ToolbarSearch
          value={q}
          onChange={setQ}
          placeholder="Search payer, email, designation, campaign…"
        />
        <ToolbarFilters>
          <Select
            value={classificationStatus}
            onChange={(e) => setClassificationStatus(e.target.value as ClassificationStatus | "")}
            style={{ minWidth: 180 }}
          >
            {CLASSIFICATIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
          <Input
            placeholder="Tax year (e.g. 2025)"
            value={taxYear}
            onChange={(e) => setTaxYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
            style={{ width: 150 }}
          />
          {(q || classificationStatus || taxYear) ? (
            <FilterChip label="Clear filters" onRemove={resetFilters} />
          ) : null}
        </ToolbarFilters>
        <ToolbarActions>
          <Button variant="ghost" size="sm" onClick={() => void resource.refresh()}>
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreating(true)}>
            Record payment
          </Button>
        </ToolbarActions>
      </Toolbar>

      <DataState
        resource={resource}
        empty={{ title: "No payments found", description: "Adjust filters or record a payment manually." }}
      >
        {() => (
          <DataTable<PaymentRow>
            rows={items}
            rowId={(p) => p.id}
            columns={columns}
            rowActions={(p) => (
              <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                Reassign
              </Button>
            )}
            exportFilename="payments.csv"
            emptyState="No matching payments"
          />
        )}
      </DataState>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `Reassign payment #${editing.id}` : "Reassign"}
        description="Match this payment to an existing person or create a guest record."
        size="lg"
      >
        {editing ? (
          <ReassignForm
            payment={editing}
            onSaved={() => {
              setEditing(null);
              void resource.refresh();
            }}
          />
        ) : null}
      </Modal>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Record a payment"
        description="Manually log a payment from any source."
        size="lg"
      >
        <CreatePaymentForm
          onSaved={() => {
            setCreating(false);
            void resource.refresh();
          }}
        />
      </Modal>
    </AdminShell>
  );
}

function ReassignForm({ payment, onSaved }: { payment: PaymentRow; onSaved: () => void }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PersonSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch() {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await fetchJson<{ items: PersonSearchResult[] }>(`/api/admin/people?q=${encodeURIComponent(search)}&limit=10`);
      setResults(res.items ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function assignTo(personId: number) {
    setSubmitting(true);
    setError(null);
    try {
      await fetchJson(`/api/admin/payments`, {
        method: "PUT",
        body: JSON.stringify({ paymentId: payment.id, personId, displayName: payment.payerDisplayName }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reassign");
    } finally {
      setSubmitting(false);
    }
  }

  async function createAndAssign(status: "guest" | "member") {
    setSubmitting(true);
    setError(null);
    try {
      await fetchJson(`/api/admin/payments`, {
        method: "PUT",
        body: JSON.stringify({
          paymentId: payment.id,
          personId: null,
          createPersonStatus: status,
          displayName: payment.payerDisplayName,
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create person");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--bk-space-3)" }}>
      <div style={{ background: "var(--bk-surface-soft)", padding: "var(--bk-space-3)", borderRadius: "var(--bk-radius-md)" }}>
        <div style={{ fontSize: "var(--bk-text-sm)", color: "var(--bk-text-soft)" }}>Payer</div>
        <div style={{ fontWeight: 700 }}>{payment.payerDisplayName}</div>
        <div style={{ fontSize: "var(--bk-text-sm)" }}>
          {payment.payerEmail || "no email"} · {payment.payerPhone || "no phone"} · {dollars(payment.amountCents)}
        </div>
      </div>

      <Field label="Search existing people">
        {(props) => (
          <div style={{ display: "flex", gap: "var(--bk-space-2)" }}>
            <Input
              {...props}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void runSearch();
                }
              }}
              placeholder="Name or email"
            />
            <Button type="button" size="sm" variant="ghost" onClick={() => void runSearch()} disabled={searching}>
              {searching ? "Searching…" : "Search"}
            </Button>
          </div>
        )}
      </Field>

      {results.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 240, overflowY: "auto" }}>
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => void assignTo(r.id)}
              disabled={submitting}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "var(--bk-space-2) var(--bk-space-3)",
                background: "var(--bk-surface)",
                border: "1px solid var(--bk-border)",
                borderRadius: "var(--bk-radius-sm)",
                cursor: submitting ? "wait" : "pointer",
                textAlign: "left",
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{r.displayName}</div>
                <div style={{ fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)" }}>{r.email}</div>
              </div>
              <Badge tone="neutral">{r.status}</Badge>
            </button>
          ))}
        </div>
      ) : null}

      <div style={{ borderTop: "1px solid var(--bk-border)", paddingTop: "var(--bk-space-3)" }}>
        <div style={{ fontSize: "var(--bk-text-sm)", color: "var(--bk-text-soft)", marginBottom: "var(--bk-space-2)" }}>
          Or create a new person record using the payer details:
        </div>
        <div style={{ display: "flex", gap: "var(--bk-space-2)" }}>
          <Button type="button" variant="ghost" size="sm" onClick={() => void createAndAssign("guest")} disabled={submitting}>
            Create guest
          </Button>
          <Button type="button" size="sm" onClick={() => void createAndAssign("member")} disabled={submitting}>
            Create member
          </Button>
        </div>
      </div>

      {error ? <p style={{ color: "var(--bk-danger)", margin: 0 }}>{error}</p> : null}
    </div>
  );
}

function CreatePaymentForm({ onSaved }: { onSaved: () => void }) {
  const [source, setSource] = useState("manual");
  const [kind, setKind] = useState("donation");
  const [amount, setAmount] = useState("");
  const [designation, setDesignation] = useState("General donation");
  const [payerDisplayName, setPayerDisplayName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 16));
  const [goodsServicesValue, setGoodsServicesValue] = useState("0");
  const [notes, setNotes] = useState("");
  const [createGuest, setCreateGuest] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const cents = Math.round(Number(amount) * 100);
      const goods = Math.round(Number(goodsServicesValue) * 100);
      if (!Number.isFinite(cents) || cents < 1) throw new Error("Amount must be > 0");
      if (!payerDisplayName.trim()) throw new Error("Payer name required");
      await fetchJson(`/api/admin/payments`, {
        method: "POST",
        body: JSON.stringify({
          source,
          kind,
          amountCents: cents,
          designation,
          payerDisplayName,
          payerEmail,
          payerPhone,
          paidAt: new Date(paidAt).toISOString(),
          goodsServicesValueCents: goods,
          notes,
          createGuestIfMissing: createGuest,
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "var(--bk-space-3)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--bk-space-3)" }}>
        <Field label="Source" required>
          {(props) => (
            <Select {...props} value={source} onChange={(e) => setSource(e.target.value)}>
              {PAYMENT_SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Kind" required>
          {(props) => (
            <Select {...props} value={kind} onChange={(e) => setKind(e.target.value)}>
              {PAYMENT_KIND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Amount (USD)" required>
          {(props) => <Input {...props} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />}
        </Field>
        <Field label="Goods/services value (USD)" hint="0 if pure donation">
          {(props) => (
            <Input {...props} inputMode="decimal" value={goodsServicesValue} onChange={(e) => setGoodsServicesValue(e.target.value)} />
          )}
        </Field>
        <Field label="Designation">
          {(props) => <Input {...props} value={designation} onChange={(e) => setDesignation(e.target.value)} />}
        </Field>
        <Field label="Paid at">
          {(props) => <Input {...props} type="datetime-local" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />}
        </Field>
        <Field label="Payer display name" required>
          {(props) => <Input {...props} value={payerDisplayName} onChange={(e) => setPayerDisplayName(e.target.value)} />}
        </Field>
        <Field label="Payer email">
          {(props) => <Input {...props} type="email" value={payerEmail} onChange={(e) => setPayerEmail(e.target.value)} />}
        </Field>
        <Field label="Payer phone">
          {(props) => <Input {...props} value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} />}
        </Field>
      </div>
      <Field label="Notes">
        {(props) => <Input {...props} value={notes} onChange={(e) => setNotes(e.target.value)} />}
      </Field>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={createGuest} onChange={(e) => setCreateGuest(e.target.checked)} />
        <span>Create guest person if no match</span>
      </label>
      {error ? <p style={{ color: "var(--bk-danger)", margin: 0, fontSize: "var(--bk-text-sm)" }}>{error}</p> : null}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--bk-space-2)" }}>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Record payment"}
        </Button>
      </div>
    </form>
  );
}
