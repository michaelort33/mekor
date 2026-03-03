"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkoutLoadingId, setCheckoutLoadingId] = useState<number | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [data, setData] = useState<DuesResponse>({ schedules: [], openInvoices: [], payments: [] });

  const totalDueCents = useMemo(
    () => data.openInvoices.reduce((total, invoice) => total + invoice.amountCents, 0),
    [data.openInvoices],
  );

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/account/dues");
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
  }, []);

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
    return <main className={styles.page}>Loading dues...</main>;
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>Dues & Payments</h1>
        <p>Review open dues, payment history, and saved payment methods.</p>
      </header>

      {error ? <p className={styles.error}>{error}</p> : null}

      <section className={styles.card}>
        <h2>Amount due</h2>
        <p className={styles.total}>{toMoney(totalDueCents, "usd")}</p>
        <button type="button" className={styles.secondaryButton} disabled={portalLoading} onClick={openPortal}>
          {portalLoading ? "Opening..." : "Manage payment methods"}
        </button>
      </section>

      <section className={styles.card}>
        <h2>Open invoices</h2>
        {data.openInvoices.length === 0 ? (
          <p>No open invoices.</p>
        ) : (
          <ul className={styles.list}>
            {data.openInvoices.map((invoice) => (
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

      <section className={styles.card}>
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

      <section className={styles.card}>
        <h2>Payment history</h2>
        {data.payments.length === 0 ? (
          <p>No payments yet.</p>
        ) : (
          <ul className={styles.list}>
            {data.payments.map((payment) => (
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
    </main>
  );
}
