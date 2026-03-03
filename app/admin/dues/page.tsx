"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import styles from "./page.module.css";

type Schedule = {
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
};

type Invoice = {
  id: number;
  userId: number;
  userEmail: string;
  userDisplayName: string;
  label: string;
  amountCents: number;
  currency: string;
  dueDate: string;
  status: "open" | "paid" | "void" | "overdue";
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export default function AdminDuesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  async function load() {
    setLoading(true);
    setError("");

    const [schedulesResponse, invoicesResponse] = await Promise.all([
      fetch("/api/admin/dues/schedules"),
      fetch("/api/admin/dues/invoices"),
    ]);

    if (schedulesResponse.status === 401 || invoicesResponse.status === 401) {
      router.push("/admin/login");
      return;
    }

    const schedulesPayload = (await schedulesResponse.json().catch(() => ({}))) as {
      schedules?: Schedule[];
      error?: string;
    };
    const invoicesPayload = (await invoicesResponse.json().catch(() => ({}))) as {
      invoices?: Invoice[];
      error?: string;
    };

    if (!schedulesResponse.ok || !invoicesResponse.ok) {
      setError(schedulesPayload.error || invoicesPayload.error || "Unable to load dues admin data");
      setLoading(false);
      return;
    }

    setSchedules(schedulesPayload.schedules ?? []);
    setInvoices(invoicesPayload.invoices ?? []);
    setLoading(false);
  }

  async function updateInvoiceStatus(id: number, status: Invoice["status"]) {
    const response = await fetch("/api/admin/dues/invoices", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error || "Unable to update invoice");
      return;
    }

    await load();
  }

  useEffect(() => {
    load().catch(() => {
      setError("Unable to load dues admin data");
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Dues Admin</h1>
          <p>Manage dues schedules and invoice states.</p>
        </div>
        <div className={styles.links}>
          <Link href="/admin/events">Events admin</Link>
          <Link href="/admin/users">Users admin</Link>
          <Link href="/admin/templates">Templates</Link>
        </div>
      </header>

      {error ? <p className={styles.error}>{error}</p> : null}

      {loading ? <p>Loading dues data...</p> : null}

      {!loading ? (
        <>
          <section className={styles.card}>
            <h2>Schedules</h2>
            {schedules.length === 0 ? (
              <p>No schedules created.</p>
            ) : (
              <ul className={styles.list}>
                {schedules.map((schedule) => (
                  <li key={schedule.id} className={styles.listItem}>
                    <strong>{schedule.userDisplayName}</strong>
                    <p>
                      {schedule.frequency} · {formatMoney(schedule.amountCents, schedule.currency)} · due {schedule.nextDueDate}
                    </p>
                    <p>{schedule.active ? "active" : "inactive"}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.card}>
            <h2>Invoices</h2>
            {invoices.length === 0 ? (
              <p>No invoices found.</p>
            ) : (
              <ul className={styles.list}>
                {invoices.map((invoice) => (
                  <li key={invoice.id} className={styles.listItem}>
                    <div>
                      <strong>
                        {invoice.userDisplayName} · {invoice.label}
                      </strong>
                      <p>
                        {formatMoney(invoice.amountCents, invoice.currency)} · due {invoice.dueDate}
                      </p>
                      <p>Status: {invoice.status}</p>
                    </div>
                    <select
                      value={invoice.status}
                      onChange={(event) => updateInvoiceStatus(invoice.id, event.target.value as Invoice["status"])}
                    >
                      <option value="open">open</option>
                      <option value="overdue">overdue</option>
                      <option value="paid">paid</option>
                      <option value="void">void</option>
                    </select>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}
