"use client";

import { useMemo, useState } from "react";

import { AccountShell } from "@/components/account/account-shell";
import { Badge, type BadgeTone } from "@/components/backend/ui/badge";
import { Button } from "@/components/backend/ui/button";
import { DataState } from "@/components/backend/data/data-state";
import { DataTable, type DataTableColumn } from "@/components/backend/ui/data-table";
import { fetchJson, useResource } from "@/components/backend/data/use-resource";
import { Select } from "@/components/backend/ui/field";
import { Alert } from "@/components/backend/ui/feedback";
import {
  FilterChip,
  Toolbar,
  ToolbarActions,
  ToolbarFilters,
} from "@/components/backend/ui/toolbar";

type Schedule = {
  id: number;
  frequency: "annual" | "monthly" | "custom";
  amountCents: number;
  currency: string;
  nextDueDate: string;
  active: boolean;
  notes: string;
};

type OpenInvoice = {
  id: number;
  label: string;
  amountCents: number;
  currency: string;
  dueDate: string;
  status: "open" | "paid" | "void" | "overdue";
  paidAt: string | null;
  stripeReceiptUrl: string;
};

type Payment = {
  id: number;
  invoiceId: number;
  amountCents: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  stripeReceiptUrl: string;
  processedAt: string | null;
  createdAt: string;
};

type DuesResponse = { schedules: Schedule[]; openInvoices: OpenInvoice[]; payments: Payment[] };

const INVOICE_TONES: Record<OpenInvoice["status"], BadgeTone> = {
  open: "info",
  overdue: "warning",
  paid: "success",
  void: "neutral",
};
const PAYMENT_TONES: Record<Payment["status"], BadgeTone> = {
  pending: "info",
  succeeded: "success",
  failed: "danger",
  refunded: "warning",
};

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export default function AccountDuesPage() {
  const [invoiceStatus, setInvoiceStatus] = useState<"" | OpenInvoice["status"]>("");
  const [paymentStatus, setPaymentStatus] = useState<"" | Payment["status"]>("");
  const [checkoutId, setCheckoutId] = useState<number | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState("");

  const resource = useResource<DuesResponse>(
    (signal) => fetchJson<DuesResponse>("/api/account/dues", { signal }),
    [],
  );

  const totalDue = useMemo(
    () => (resource.data?.openInvoices ?? []).reduce((sum, inv) => sum + inv.amountCents, 0),
    [resource.data],
  );

  const filteredInvoices = useMemo(
    () =>
      (resource.data?.openInvoices ?? []).filter((inv) => (invoiceStatus ? inv.status === invoiceStatus : true)),
    [resource.data, invoiceStatus],
  );
  const filteredPayments = useMemo(
    () =>
      (resource.data?.payments ?? []).filter((p) => (paymentStatus ? p.status === paymentStatus : true)),
    [resource.data, paymentStatus],
  );

  const primaryRenewal = resource.data?.openInvoices[0] ?? null;

  async function payInvoice(invoiceId: number) {
    setError("");
    setCheckoutId(invoiceId);
    try {
      const body = await fetchJson<{ url?: string }>(`/api/account/dues/${invoiceId}/checkout`, { method: "POST" });
      if (body.url) window.location.assign(body.url);
      else setError("Checkout URL missing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start checkout");
    } finally {
      setCheckoutId(null);
    }
  }

  async function openPortal() {
    setError("");
    setPortalLoading(true);
    try {
      const body = await fetchJson<{ url?: string }>("/api/account/stripe/portal", { method: "POST" });
      if (body.url) window.location.assign(body.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open portal");
    } finally {
      setPortalLoading(false);
    }
  }

  const invoiceColumns: DataTableColumn<OpenInvoice>[] = [
    {
      id: "label",
      header: "Invoice",
      accessor: (r) => <strong>{r.label}</strong>,
      exportValue: (r) => r.label,
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      accessor: (r) => money(r.amountCents, r.currency),
      sortValue: (r) => r.amountCents,
      exportValue: (r) => r.amountCents / 100,
    },
    {
      id: "dueDate",
      header: "Due",
      accessor: (r) => r.dueDate,
      sortValue: (r) => r.dueDate,
      exportValue: (r) => r.dueDate,
    },
    {
      id: "status",
      header: "Status",
      accessor: (r) => <Badge tone={INVOICE_TONES[r.status]}>{r.status}</Badge>,
      sortValue: (r) => r.status,
      exportValue: (r) => r.status,
    },
  ];

  const paymentColumns: DataTableColumn<Payment>[] = [
    {
      id: "invoice",
      header: "Invoice",
      accessor: (r) => `#${r.invoiceId}`,
      exportValue: (r) => r.invoiceId,
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      accessor: (r) => money(r.amountCents, r.currency),
      sortValue: (r) => r.amountCents,
      exportValue: (r) => r.amountCents / 100,
    },
    {
      id: "status",
      header: "Status",
      accessor: (r) => <Badge tone={PAYMENT_TONES[r.status]}>{r.status}</Badge>,
      sortValue: (r) => r.status,
      exportValue: (r) => r.status,
    },
    {
      id: "date",
      header: "When",
      accessor: (r) => new Date(r.processedAt ?? r.createdAt).toLocaleString(),
      sortValue: (r) => r.processedAt ?? r.createdAt,
      exportValue: (r) => r.processedAt ?? r.createdAt,
    },
    {
      id: "receipt",
      header: "Receipt",
      accessor: (r) =>
        r.stripeReceiptUrl ? (
          <a href={r.stripeReceiptUrl} target="_blank" rel="noreferrer noopener">Open</a>
        ) : (
          "—"
        ),
      exportValue: (r) => r.stripeReceiptUrl,
    },
  ];

  const scheduleColumns: DataTableColumn<Schedule>[] = [
    {
      id: "frequency",
      header: "Frequency",
      accessor: (r) => <Badge tone={r.active ? "success" : "neutral"}>{r.frequency}</Badge>,
      sortValue: (r) => r.frequency,
      exportValue: (r) => r.frequency,
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      accessor: (r) => money(r.amountCents, r.currency),
      sortValue: (r) => r.amountCents,
      exportValue: (r) => r.amountCents / 100,
    },
    {
      id: "nextDue",
      header: "Next due",
      accessor: (r) => r.nextDueDate,
      sortValue: (r) => r.nextDueDate,
      exportValue: (r) => r.nextDueDate,
    },
    {
      id: "notes",
      header: "Notes",
      accessor: (r) => r.notes || "—",
      exportValue: (r) => r.notes,
      hideOnMobile: true,
    },
  ];

  const stats = resource.data
    ? [
        { label: "Amount due", value: money(totalDue, "usd"), hint: `${resource.data.openInvoices.length} open invoice(s)` },
        { label: "Schedules", value: String(resource.data.schedules.length), hint: "Recurring dues rules" },
        { label: "Payments", value: String(resource.data.payments.length), hint: "Recorded history" },
      ]
    : [];

  return (
    <AccountShell
      currentPath="/account/dues"
      title="Dues"
      description="Review open dues, recurring schedules, and payment history."
      stats={stats}
      actions={
        <>
          {primaryRenewal ? (
            <Button
              size="sm"
              onClick={() => payInvoice(primaryRenewal.id)}
              disabled={checkoutId === primaryRenewal.id}
            >
              {checkoutId === primaryRenewal.id ? "Opening…" : "Click to Renew"}
            </Button>
          ) : null}
          <Button size="sm" variant="secondary" disabled={portalLoading} onClick={openPortal}>
            {portalLoading ? "Opening…" : "Payment methods"}
          </Button>
        </>
      }
    >
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <Toolbar>
        <ToolbarFilters>
          <Select value={invoiceStatus} onChange={(e) => setInvoiceStatus(e.target.value as OpenInvoice["status"] | "")}>
            <option value="">All invoice statuses</option>
            <option value="open">Open</option>
            <option value="overdue">Overdue</option>
            <option value="paid">Paid</option>
            <option value="void">Void</option>
          </Select>
          <Select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as Payment["status"] | "")}>
            <option value="">All payment statuses</option>
            <option value="pending">Pending</option>
            <option value="succeeded">Succeeded</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </Select>
          {(invoiceStatus || paymentStatus) ? (
            <FilterChip
              label="Clear filters"
              onRemove={() => {
                setInvoiceStatus("");
                setPaymentStatus("");
              }}
            />
          ) : null}
        </ToolbarFilters>
        <ToolbarActions>
          <Button size="sm" variant="ghost" onClick={() => void resource.refresh()}>
            Refresh
          </Button>
        </ToolbarActions>
      </Toolbar>

      <DataState resource={resource} empty={{ title: "No dues data", description: "We couldn't load your dues." }}>
        {() => (
          <div style={{ display: "grid", gap: "var(--bk-space-4)" }}>
            <section>
              <h3 style={{ margin: "var(--bk-space-2) 0" }}>Open invoices</h3>
              <DataTable<OpenInvoice>
                rows={filteredInvoices}
                rowId={(r) => r.id}
                columns={invoiceColumns}
                rowActions={(r) => (
                  <Button size="sm" disabled={checkoutId === r.id} onClick={() => payInvoice(r.id)}>
                    {checkoutId === r.id ? "Redirecting…" : "Pay"}
                  </Button>
                )}
                exportFilename="open-invoices.csv"
                emptyState="No open invoices match the current filter"
              />
            </section>

            <section>
              <h3 style={{ margin: "var(--bk-space-2) 0" }}>Recurring schedules</h3>
              <DataTable<Schedule>
                rows={resource.data?.schedules ?? []}
                rowId={(r) => r.id}
                columns={scheduleColumns}
                exportFilename="dues-schedules.csv"
                emptyState="No schedules configured"
              />
            </section>

            <section>
              <h3 style={{ margin: "var(--bk-space-2) 0" }}>Payment history</h3>
              <DataTable<Payment>
                rows={filteredPayments}
                rowId={(r) => r.id}
                columns={paymentColumns}
                exportFilename="dues-payments.csv"
                emptyState="No payments recorded yet"
              />
            </section>
          </div>
        )}
      </DataState>
    </AccountShell>
  );
}
