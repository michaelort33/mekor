"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { MemberShell } from "@/components/members/member-shell";
import memberShellStyles from "@/components/members/member-shell.module.css";
import styles from "./page.module.css";

type PaymentRow = {
  id: number;
  source: string;
  kind: string;
  designation: string;
  amountCents: number;
  deductibleAmountCents: number;
  currency: string;
  classificationStatus: string;
  paidAt: string;
  campaignTitle: string | null;
};

type PaymentsResponse = {
  actor: {
    userId: number;
    personId: number | null;
    displayName: string;
  };
  familyAdmin: boolean;
  selectedTaxYear: number;
  availableYears: number[];
  personalPayments: PaymentRow[];
  familyPayments: PaymentRow[];
  taxSummary: {
    totalAmountCents: number;
    totalDeductibleAmountCents: number;
  } | null;
};

function formatMoney(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export default function AccountPaymentsPage() {
  const router = useRouter();
  const [data, setData] = useState<PaymentsResponse | null>(null);
  const [taxYear, setTaxYear] = useState(String(new Date().getUTCFullYear()));
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/account/payments?taxYear=${encodeURIComponent(taxYear)}`);
      if (response.status === 401) {
        router.replace("/login?next=/account/payments");
        return;
      }
      const payload = (await response.json().catch(() => ({}))) as PaymentsResponse & { error?: string };
      if (!response.ok) {
        setError(payload.error || "Unable to load payments");
        return;
      }
      setData(payload);
    }
    load().catch(() => setError("Unable to load payments"));
  }, [router, taxYear]);

  const stats = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Personal payments", value: String(data.personalPayments.length), hint: "All recorded transactions" },
      { label: "Deductible this year", value: formatMoney(data.taxSummary?.totalDeductibleAmountCents ?? 0), hint: `Tax year ${data.selectedTaxYear}` },
      { label: "Household visibility", value: data.familyAdmin ? "Enabled" : "Personal only", hint: data.familyAdmin ? "Primary household admin access" : "No family-wide access" },
    ];
  }, [data]);

  return (
    <MemberShell
      title="Payments"
      description="View your full payment history, household giving visibility when applicable, and download exports for records."
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Members Area", href: "/members" },
        { label: "Payments" },
      ]}
      activeSection="payments"
      stats={stats}
      actions={
        <>
          <Link href="/account/dues" className={memberShellStyles.actionPill}>Click to Renew</Link>
          <Link href="/donations" className={memberShellStyles.actionPill}>Give</Link>
        </>
      }
    >
      <div className={styles.stack}>
        <section className={`${styles.card} internal-card`}>
          <div className={styles.toolbar}>
            <label>
              Tax year
              <select value={taxYear} onChange={(event) => setTaxYear(event.target.value)}>
                {(data?.availableYears.length ? data.availableYears : [new Date().getUTCFullYear()]).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <a className={styles.linkButton} href="/api/account/payments/export?format=csv">
              Export CSV
            </a>
            <a className={styles.linkButton} href="/api/account/payments/export?format=pdf">
              Export PDF
            </a>
            {data?.familyAdmin ? (
              <a className={styles.linkButton} href="/api/account/payments/export?format=csv&scope=family">
                Export household CSV
              </a>
            ) : null}
            <a className={styles.linkButton} href={`/api/account/payments/year-end-letter?taxYear=${encodeURIComponent(taxYear)}`}>
              Year-end letter
            </a>
          </div>
          {error ? <p>{error}</p> : null}
          <p className={styles.metric}>{formatMoney(data?.taxSummary?.totalDeductibleAmountCents ?? 0)}</p>
          <p>Deductible total for tax year {taxYear}</p>
        </section>

        <section className={`${styles.card} internal-card`}>
          <h2>Personal payment history</h2>
          <div className={styles.list}>
            {(data?.personalPayments ?? []).map((payment) => (
              <article key={payment.id} className={styles.item}>
                <strong>{payment.designation}</strong>
                <div className={styles.meta}>
                  <span>{formatMoney(payment.amountCents, payment.currency)}</span>
                  <span>{payment.source}</span>
                  <span>{payment.kind}</span>
                  <span>{new Date(payment.paidAt).toLocaleString()}</span>
                </div>
                <div className={styles.meta}>
                  <span>Deductible: {formatMoney(payment.deductibleAmountCents, payment.currency)}</span>
                  {payment.campaignTitle ? <span>Campaign: {payment.campaignTitle}</span> : null}
                  {payment.deductibleAmountCents > 0 ? <a href={`/api/account/payments/receipt/${payment.id}`}>Receipt PDF</a> : null}
                </div>
              </article>
            ))}
            {data && data.personalPayments.length === 0 ? <p>No payments recorded yet.</p> : null}
          </div>
        </section>

        {data?.familyAdmin ? (
          <section className={`${styles.card} internal-card`}>
            <h2>Household donation visibility</h2>
            <div className={styles.list}>
              {data.familyPayments.map((payment) => (
                <article key={payment.id} className={styles.item}>
                  <strong>{payment.designation}</strong>
                  <div className={styles.meta}>
                    <span>{formatMoney(payment.amountCents, payment.currency)}</span>
                    <span>{payment.source}</span>
                    <span>{new Date(payment.paidAt).toLocaleString()}</span>
                  </div>
                  <div className={styles.meta}>
                    <span>Deductible: {formatMoney(payment.deductibleAmountCents, payment.currency)}</span>
                    {payment.campaignTitle ? <span>Campaign: {payment.campaignTitle}</span> : null}
                    {payment.deductibleAmountCents > 0 ? <a href={`/api/account/payments/receipt/${payment.id}`}>Receipt PDF</a> : null}
                  </div>
                </article>
              ))}
              {data.familyPayments.length === 0 ? <p>No household payments available.</p> : null}
            </div>
          </section>
        ) : null}
      </div>
    </MemberShell>
  );
}
