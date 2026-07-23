"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AccountShell } from "@/components/account/account-shell";
import { Badge, type BadgeTone } from "@/components/backend/ui/badge";
import { Button } from "@/components/backend/ui/button";
import { Card, CardBody, CardHeader } from "@/components/backend/ui/card";
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
import styles from "./page.module.css";

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

function formatDueDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

  const payableInvoices = useMemo(
    () => (resource.data?.openInvoices ?? []).filter((inv) => inv.status === "open" || inv.status === "overdue"),
    [resource.data],
  );

  const totalDue = useMemo(
    () => payableInvoices.reduce((sum, inv) => sum + inv.amountCents, 0),
    [payableInvoices],
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

  const primaryRenewal = payableInvoices[0] ?? null;
  const overdueCount = payableInvoices.filter((inv) => inv.status === "overdue").length;

  async function payInvoice(invoiceId: number) {
    setError("");
    setCheckoutId(invoiceId);
    try {
      const body = await fetchJson<{ url?: string }>(`/api/account/dues/${invoiceId}/checkout`, { method: "POST" });
      if (body.url) window.location.assign(body.url);
      else setError("We couldn't start checkout because the payment link was missing. Try again, or manage cards below.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't open Stripe checkout. Check your connection and try again.",
      );
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
      else setError("We couldn't open the payment methods portal. Try again in a moment.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open payment methods portal.");
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
      accessor: (r) => formatDueDate(r.dueDate),
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
          <a href={r.stripeReceiptUrl} target="_blank" rel="noreferrer noopener">
            Open receipt
          </a>
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
      accessor: (r) => formatDueDate(r.nextDueDate),
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
        {
          label: "Amount due",
          value: money(totalDue, "usd"),
          hint: `${payableInvoices.length} payable invoice${payableInvoices.length === 1 ? "" : "s"}`,
        },
        { label: "Schedules", value: String(resource.data.schedules.length), hint: "Recurring dues rules" },
        { label: "Payments", value: String(resource.data.payments.length), hint: "Recorded history" },
      ]
    : [];

  return (
    <AccountShell
      currentPath="/account/dues"
      title="Dues"
      description="Pay open invoices, manage saved payment methods, and review your dues history."
      stats={stats}
      actions={
        <>
          {primaryRenewal ? (
            <Button
              size="sm"
              onClick={() => payInvoice(primaryRenewal.id)}
              disabled={checkoutId === primaryRenewal.id}
            >
              {checkoutId === primaryRenewal.id
                ? "Opening checkout…"
                : `Pay ${money(primaryRenewal.amountCents, primaryRenewal.currency)}`}
            </Button>
          ) : null}
          <Button size="sm" variant="secondary" disabled={portalLoading} onClick={openPortal}>
            {portalLoading ? "Opening…" : "Manage payment methods"}
          </Button>
        </>
      }
    >
      {error ? (
        <Alert tone="danger">
          {error}{" "}
          <Link href="/account/payments" style={{ fontWeight: 700 }}>
            View payment history
          </Link>
        </Alert>
      ) : null}

      <DataState
        resource={resource}
        empty={{
          title: "No dues data yet",
          description: "Once membership dues are issued, open invoices and payment history will appear here.",
        }}
      >
        {() => (
          <div className={styles.stack}>
            <Card padded className={styles.checkoutCard}>
              <CardHeader
                title={totalDue > 0 ? "Ready to pay" : "You're caught up"}
                description={
                  totalDue > 0
                    ? overdueCount > 0
                      ? `${overdueCount} invoice${overdueCount === 1 ? " is" : "s are"} past due. Pay securely through Stripe.`
                      : "Review the amount below, then continue to Stripe secure checkout."
                    : "No open dues right now. You can still update saved cards or review history."
                }
              />
              <CardBody>
                <div className={styles.checkoutGrid}>
                  <div>
                    <p className={styles.checkoutLabel}>Total due</p>
                    <p className={styles.checkoutTotal}>{money(totalDue, "usd")}</p>
                    {primaryRenewal ? (
                      <p className={styles.checkoutMeta}>
                        Next invoice: {primaryRenewal.label} · due {formatDueDate(primaryRenewal.dueDate)}
                      </p>
                    ) : (
                      <p className={styles.checkoutMeta}>Nothing to pay at the moment.</p>
                    )}
                  </div>
                  <div className={styles.checkoutActions}>
                    {primaryRenewal ? (
                      <Button
                        onClick={() => payInvoice(primaryRenewal.id)}
                        disabled={checkoutId === primaryRenewal.id}
                      >
                        {checkoutId === primaryRenewal.id
                          ? "Opening Stripe…"
                          : `Continue to pay ${money(primaryRenewal.amountCents, primaryRenewal.currency)}`}
                      </Button>
                    ) : (
                      <Link href="/membership/apply">
                        <Button variant="secondary">Apply or renew membership</Button>
                      </Link>
                    )}
                    <Button variant="ghost" disabled={portalLoading} onClick={openPortal}>
                      {portalLoading ? "Opening…" : "Update payment methods"}
                    </Button>
                    <p className={styles.trustNote}>
                      Checkout opens on Stripe. You&apos;ll return here after payment completes or if you cancel.
                    </p>
                  </div>
                </div>
                {payableInvoices.length > 1 ? (
                  <ul className={styles.invoicePreview}>
                    {payableInvoices.map((invoice) => (
                      <li key={invoice.id}>
                        <div>
                          <strong>{invoice.label}</strong>
                          <span>
                            {money(invoice.amountCents, invoice.currency)} · due {formatDueDate(invoice.dueDate)}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant={invoice.id === primaryRenewal?.id ? "primary" : "secondary"}
                          disabled={checkoutId === invoice.id}
                          onClick={() => payInvoice(invoice.id)}
                        >
                          {checkoutId === invoice.id ? "Opening…" : `Pay ${money(invoice.amountCents, invoice.currency)}`}
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </CardBody>
            </Card>

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
                {invoiceStatus || paymentStatus ? (
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

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Open invoices</h3>
              <DataTable<OpenInvoice>
                rows={filteredInvoices}
                rowId={(r) => r.id}
                columns={invoiceColumns}
                rowActions={(r) =>
                  r.status === "open" || r.status === "overdue" ? (
                    <Button size="sm" disabled={checkoutId === r.id} onClick={() => payInvoice(r.id)}>
                      {checkoutId === r.id ? "Redirecting…" : `Pay ${money(r.amountCents, r.currency)}`}
                    </Button>
                  ) : null
                }
                exportFilename="open-invoices.csv"
                emptyState="No invoices match the current filter"
              />
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Recurring schedules</h3>
              <DataTable<Schedule>
                rows={resource.data?.schedules ?? []}
                rowId={(r) => r.id}
                columns={scheduleColumns}
                exportFilename="dues-schedules.csv"
                emptyState="No schedules configured"
              />
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Payment history</h3>
              <DataTable<Payment>
                rows={filteredPayments}
                rowId={(r) => r.id}
                columns={paymentColumns}
                exportFilename="dues-payments.csv"
                emptyState="No dues payments recorded yet"
              />
            </section>
          </div>
        )}
      </DataState>
    </AccountShell>
  );
}
