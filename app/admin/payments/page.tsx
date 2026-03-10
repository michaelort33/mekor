"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { PAYMENT_KIND_OPTIONS, PAYMENT_SOURCE_OPTIONS } from "@/lib/payments/shared";
import styles from "./page.module.css";

type PaymentRow = {
  id: number;
  personId: number | null;
  source: string;
  status: string;
  kind: string;
  classificationStatus: "unreconciled" | "auto_matched" | "manually_matched";
  taxDeductibility: string;
  amountCents: number;
  deductibleAmountCents: number;
  designation: string;
  payerDisplayName: string;
  payerEmail: string;
  payerPhone: string;
  paidAt: string;
  personDisplayName: string | null;
  personStatus: string | null;
  campaignTitle: string | null;
};

type PersonSearchResult = {
  id: number;
  displayName: string;
  email: string;
  status: string;
};

const initialForm = {
  source: "manual",
  sourceLabel: "",
  externalPaymentId: "",
  externalReference: "",
  status: "succeeded",
  kind: "donation",
  amountCents: "",
  designation: "General donation",
  payerDisplayName: "",
  payerEmail: "",
  payerPhone: "",
  paidAt: new Date().toISOString().slice(0, 16),
  goodsServicesValueCents: "0",
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [classificationStatus, setClassificationStatus] = useState<"" | PaymentRow["classificationStatus"]>("unreconciled");
  const [form, setForm] = useState(initialForm);
  const [searchTerms, setSearchTerms] = useState<Record<number, string>>({});
  const [matchesByPayment, setMatchesByPayment] = useState<Record<number, PersonSearchResult[]>>({});

  async function fetchPayments() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (classificationStatus) params.set("classificationStatus", classificationStatus);
    const response = await fetch(`/api/admin/payments?${params.toString()}`).catch(() => null);
    if (!response) {
      return { payments: [] as PaymentRow[], error: "Unable to load payments" };
    }
    const payload = (await response.json().catch(() => ({}))) as { payments?: PaymentRow[]; error?: string };
    if (!response.ok) {
      return { payments: [] as PaymentRow[], error: payload.error || "Unable to load payments" };
    }
    return { payments: payload.payments ?? [], error: "" };
  }

  const loadPaymentsForEffect = useEffectEvent(async () => {
    const payload = await fetchPayments();
    if (payload.error) {
      setError(payload.error);
      return;
    }
    setPayments(payload.payments);
  });

  async function refreshPayments() {
    const payload = await fetchPayments();
    if (payload.error) {
      setError(payload.error);
      return;
    }
    setPayments(payload.payments);
  }

  useEffect(() => {
    void loadPaymentsForEffect();
  }, [classificationStatus, q]);

  const stats = useMemo(
    () => [
      { label: "Visible payments", value: String(payments.length), hint: "Current filter set" },
      { label: "Unreconciled", value: String(payments.filter((item) => item.classificationStatus === "unreconciled").length), hint: "Needs staff review" },
      { label: "Deductible total", value: formatMoney(payments.reduce((sum, item) => sum + item.deductibleAmountCents, 0)), hint: "Visible rows only" },
    ],
    [payments],
  );

  async function createPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const response = await fetch("/api/admin/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        amountCents: Number(form.amountCents),
        goodsServicesValueCents: Number(form.goodsServicesValueCents),
        paidAt: new Date(form.paidAt).toISOString(),
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(payload.error || "Unable to record payment");
      return;
    }
    setForm(initialForm);
    await refreshPayments();
  }

  async function searchPeople(paymentId: number) {
    const term = searchTerms[paymentId]?.trim() ?? "";
    if (!term) return;
    const response = await fetch(`/api/admin/people?limit=8&q=${encodeURIComponent(term)}`);
    const payload = (await response.json().catch(() => ({}))) as { items?: PersonSearchResult[] };
    setMatchesByPayment((prev) => ({ ...prev, [paymentId]: payload.items ?? [] }));
  }

  async function reassign(paymentId: number, body: { personId?: number; createPersonStatus?: "guest" | "member"; displayName?: string }) {
    const response = await fetch("/api/admin/payments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, ...body }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error || "Unable to reassign payment");
      return;
    }
    await refreshPayments();
  }

  return (
    <AdminShell
      currentPath="/admin/payments"
      title="Payments"
      description="Stage unreconciled payments, search the CRM, and classify each record to a member or guest with retained contact aliases."
      stats={stats}
    >
      <div className={styles.stack}>
        <section className={`${styles.card} internal-card`}>
          <h2>Record payment</h2>
          <form className={styles.stack} onSubmit={createPayment}>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span>Source</span>
                <select value={form.source} onChange={(event) => setForm((prev) => ({ ...prev, source: event.target.value }))}>
                  {PAYMENT_SOURCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Type</span>
                <select value={form.kind} onChange={(event) => setForm((prev) => ({ ...prev, kind: event.target.value }))}>
                  {PAYMENT_KIND_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Amount (cents)</span>
                <input value={form.amountCents} onChange={(event) => setForm((prev) => ({ ...prev, amountCents: event.target.value }))} required />
              </label>
              <label className={styles.field}>
                <span>Purpose / designation</span>
                <input value={form.designation} onChange={(event) => setForm((prev) => ({ ...prev, designation: event.target.value }))} required />
              </label>
              <label className={styles.field}>
                <span>Donor / payer</span>
                <input value={form.payerDisplayName} onChange={(event) => setForm((prev) => ({ ...prev, payerDisplayName: event.target.value }))} required />
              </label>
              <label className={styles.field}>
                <span>Email</span>
                <input value={form.payerEmail} onChange={(event) => setForm((prev) => ({ ...prev, payerEmail: event.target.value }))} />
              </label>
              <label className={styles.field}>
                <span>Phone</span>
                <input value={form.payerPhone} onChange={(event) => setForm((prev) => ({ ...prev, payerPhone: event.target.value }))} />
              </label>
              <label className={styles.field}>
                <span>Paid at</span>
                <input type="datetime-local" value={form.paidAt} onChange={(event) => setForm((prev) => ({ ...prev, paidAt: event.target.value }))} required />
              </label>
              <label className={styles.field}>
                <span>Goods/services value (cents)</span>
                <input value={form.goodsServicesValueCents} onChange={(event) => setForm((prev) => ({ ...prev, goodsServicesValueCents: event.target.value }))} />
              </label>
            </div>
            {error ? <p className={styles.error}>{error}</p> : null}
            <div className={styles.toolbar}>
              <button type="submit" className={styles.button} disabled={saving}>
                {saving ? "Saving..." : "Record payment"}
              </button>
            </div>
          </form>
        </section>

        <section className={`${styles.card} internal-card`}>
          <div className={styles.toolbar}>
            <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search donor, purpose, campaign..." />
            <select value={classificationStatus} onChange={(event) => setClassificationStatus(event.target.value as "" | PaymentRow["classificationStatus"])}>
              <option value="">all classifications</option>
              <option value="unreconciled">unreconciled</option>
              <option value="auto_matched">auto matched</option>
              <option value="manually_matched">manually matched</option>
            </select>
          </div>

          <div className={styles.list}>
            {payments.map((payment) => (
              <article key={payment.id} className={styles.item}>
                <div>
                  <strong>{payment.payerDisplayName}</strong>
                  <div className={styles.meta}>
                    <span>{formatMoney(payment.amountCents)}</span>
                    <span>{payment.source}</span>
                    <span>{payment.kind}</span>
                    <span>{payment.designation}</span>
                    <span>{new Date(payment.paidAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className={styles.meta}>
                  <span>Classification: {payment.classificationStatus}</span>
                  <span>CRM: {payment.personDisplayName ? `${payment.personDisplayName} (${payment.personStatus})` : "Unassigned"}</span>
                  <span>Deductible: {formatMoney(payment.deductibleAmountCents)}</span>
                </div>
                {payment.classificationStatus === "unreconciled" ? (
                  <div className={styles.assignBox}>
                    <div className={styles.toolbar}>
                      <input
                        value={searchTerms[payment.id] ?? ""}
                        onChange={(event) => setSearchTerms((prev) => ({ ...prev, [payment.id]: event.target.value }))}
                        placeholder="Search member or guest"
                      />
                      <button type="button" className={styles.ghostButton} onClick={() => searchPeople(payment.id)}>
                        Search CRM
                      </button>
                      <button type="button" className={styles.ghostButton} onClick={() => reassign(payment.id, { createPersonStatus: "guest", displayName: payment.payerDisplayName })}>
                        Create guest
                      </button>
                      <button type="button" className={styles.ghostButton} onClick={() => reassign(payment.id, { createPersonStatus: "member", displayName: payment.payerDisplayName })}>
                        Create member CRM record
                      </button>
                    </div>
                    <div className={styles.matchList}>
                      {(matchesByPayment[payment.id] ?? []).map((match) => (
                        <button key={match.id} type="button" className={styles.matchButton} onClick={() => reassign(payment.id, { personId: match.id })}>
                          {match.displayName} · {match.email} · {match.status}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
            {payments.length === 0 ? <p>No payments match the current filters.</p> : null}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
