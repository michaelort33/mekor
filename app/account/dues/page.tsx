"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { MemberShell } from "@/components/members/member-shell";
import memberShellStyles from "@/components/members/member-shell.module.css";
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

type DuesResponse = {
  schedules: Schedule[];
  openInvoices: OpenInvoice[];
  payments: Payment[];
};

function toMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export default function AccountDuesPage() {
  const router = useRouter();
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<"" | OpenInvoice["status"]>("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<"" | Payment["status"]>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkoutLoadingId, setCheckoutLoadingId] = useState<number | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [data, setData] = useState<DuesResponse>({ schedules: [], openInvoices: [], payments: [] });

  const totalDueCents = useMemo(
    () => data.openInvoices.reduce((total, invoice) => total + invoice.amountCents, 0),
    [data.openInvoices],
  );

  const filteredInvoices = useMemo(
    () => data.openInvoices.filter((invoice) => (invoiceStatusFilter ? invoice.status === invoiceStatusFilter : true)),
    [data.openInvoices, invoiceStatusFilter],
  );

  const filteredPayments = useMemo(
    () => data.payments.filter((payment) => (paymentStatusFilter ? payment.status === paymentStatusFilter : true)),
    [data.payments, paymentStatusFilter],
  );

  const primaryRenewalInvoice = data.openInvoices[0] ?? null;

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/account/dues");
      if (response.status === 401) {
        router.replace("/login?next=/account/dues");
        return;
      }
      const payload = (await response.json().catch(() => ({}))) as DuesResponse & { error?: string };

      if (!response.ok) {
        setError(payload.error || "Unable to load dues");
        setLoading(false);
        return;
      }

      setData(payload);
      setLoading(false);
    }

    load().catch(() => {
      setError("Unable to load dues");
      setLoading(false);
    });
  }, [router]);

  async function payInvoice(invoiceId: number) {
    setCheckoutLoadingId(invoiceId);
    const response = await fetch(`/api/account/dues/${invoiceId}/checkout`, {
      method: "POST",
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; url?: string };

    if (!response.ok || !payload.url) {
      setError(payload.error || "Unable to start checkout");
      setCheckoutLoadingId(null);
      return;
    }

    window.location.assign(payload.url);
  }

  async function openPortal() {
    setPortalLoading(true);
    const response = await fetch("/api/account/stripe/portal", {
      method: "POST",
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; url?: string };

    if (!response.ok || !payload.url) {
      setError(payload.error || "Unable to open portal");
      setPortalLoading(false);
      return;
    }

    window.location.assign(payload.url);
  }

  if (loading) {
    return <main className={`${styles.page} internal-page`}>Loading dues...</main>;
  }

  const shellStats = [
    { label: "Amount due", value: toMoney(totalDueCents, "usd"), hint: `${data.openInvoices.length} open invoice(s)` },
    { label: "Schedules", value: String(data.schedules.length), hint: "Recurring dues rules" },
    { label: "Payments", value: String(data.payments.length), hint: "Recorded payment history" },
  ];

  return (
    <MemberShell
      title="Dues & Payments"
      description="Review open dues, payment history, and saved payment methods."
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Members Area", href: "/members" },
        { label: "Dues & Payments" },
      ]}
      activeSection="dues"
      stats={shellStats}
      actions={
        <>
          {primaryRenewalInvoice ? (
            <button
              type="button"
              className={memberShellStyles.primaryButton}
              disabled={checkoutLoadingId === primaryRenewalInvoice.id}
              onClick={() => payInvoice(primaryRenewalInvoice.id)}
            >
              {checkoutLoadingId === primaryRenewalInvoice.id ? "Opening..." : "Click to Renew"}
            </button>
          ) : null}
          <button type="button" className={memberShellStyles.secondaryButton} disabled={portalLoading} onClick={openPortal}>
            {portalLoading ? "Opening..." : "Manage payment methods"}
          </button>
        </>
      }
    >

      <section className={memberShellStyles.toolbar}>
        <div className={memberShellStyles.toolbarHeader}>
          <p className={memberShellStyles.toolbarTitle}>Payment filters</p>
          <p className={memberShellStyles.toolbarMeta}>Narrow open invoices and payment history by status.</p>
        </div>
        <div className={memberShellStyles.toolbarFields}>
          <label>
            Invoice status
            <select value={invoiceStatusFilter} onChange={(event) => setInvoiceStatusFilter(event.target.value as "" | OpenInvoice["status"])}>
              <option value="">All</option>
              <option value="open">open</option>
              <option value="overdue">overdue</option>
              <option value="paid">paid</option>
              <option value="void">void</option>
            </select>
          </label>
          <label>
            Payment status
            <select value={paymentStatusFilter} onChange={(event) => setPaymentStatusFilter(event.target.value as "" | Payment["status"])}>
              <option value="">All</option>
              <option value="pending">pending</option>
              <option value="succeeded">succeeded</option>
              <option value="failed">failed</option>
              <option value="refunded">refunded</option>
            </select>
          </label>
        </div>
        <div className={memberShellStyles.toolbarActions}>
          <button type="button" className={memberShellStyles.secondaryButton} onClick={() => { setInvoiceStatusFilter(""); setPaymentStatusFilter(""); }}>
            Clear filters
          </button>
        </div>
      </section>

      {error ? <p className={styles.error}>{error}</p> : null}

      <section className={`${styles.card} internal-card`}>
        <h2>Amount due</h2>
        <p className={styles.total}>{toMoney(totalDueCents, "usd")}</p>
        <p>{filteredInvoices.length} invoice(s) visible with current filters.</p>
      </section>

      <section className={`${styles.card} internal-card`}>
        <h2>Open invoices</h2>
        {filteredInvoices.length === 0 ? (
          <p>No open invoices.</p>
        ) : (
          <ul className={styles.list}>
            {filteredInvoices.map((invoice) => (
              <li key={invoice.id} className={styles.listItem}>
                <div>
                  <strong>{invoice.label}</strong>
                  <p>
                    Due {invoice.dueDate} · {invoice.status}
                  </p>
                  <p>{toMoney(invoice.amountCents, invoice.currency)}</p>
                </div>
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={checkoutLoadingId === invoice.id}
                  onClick={() => payInvoice(invoice.id)}
                >
                  {checkoutLoadingId === invoice.id ? "Redirecting..." : "Pay now"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${styles.card} internal-card`}>
        <h2>Schedules</h2>
        {data.schedules.length === 0 ? (
          <p>No schedules configured yet.</p>
        ) : (
          <ul className={styles.list}>
            {data.schedules.map((schedule) => (
              <li key={schedule.id} className={styles.listItem}>
                <div>
                  <strong>{schedule.frequency}</strong>
                  <p>
                    {toMoney(schedule.amountCents, schedule.currency)} · next due {schedule.nextDueDate}
                  </p>
                  {schedule.notes ? <p>{schedule.notes}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${styles.card} internal-card`}>
        <h2>Payment history</h2>
        {filteredPayments.length === 0 ? (
          <p>No payments yet.</p>
        ) : (
          <ul className={styles.list}>
            {filteredPayments.map((payment) => (
              <li key={payment.id} className={styles.listItem}>
                <div>
                  <strong>
                    Invoice #{payment.invoiceId} · {toMoney(payment.amountCents, payment.currency)}
                  </strong>
                  <p>
                    {payment.status} · {payment.processedAt || payment.createdAt}
                  </p>
                </div>
                {payment.stripeReceiptUrl ? (
                  <a href={payment.stripeReceiptUrl} target="_blank" rel="noreferrer noopener">
                    Receipt
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href="/account/profile" className={styles.backLink}>
        ← Back to profile
      </Link>
    </MemberShell>
  );
}
