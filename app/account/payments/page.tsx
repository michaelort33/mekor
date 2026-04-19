"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AccountShell } from "@/components/account/account-shell";
import { Badge } from "@/components/backend/ui/badge";
import { Button } from "@/components/backend/ui/button";
import { Card, CardBody, CardHeader } from "@/components/backend/ui/card";
import { DataState } from "@/components/backend/data/data-state";
import { DataTable, type DataTableColumn } from "@/components/backend/ui/data-table";
import { fetchJson, useResource } from "@/components/backend/data/use-resource";
import { Select } from "@/components/backend/ui/field";
import { Alert } from "@/components/backend/ui/feedback";
import {
  Toolbar,
  ToolbarActions,
  ToolbarFilters,
} from "@/components/backend/ui/toolbar";

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
  actor: { userId: number; personId: number | null; displayName: string };
  familyAdmin: boolean;
  selectedTaxYear: number;
  availableYears: number[];
  personalPayments: PaymentRow[];
  familyPayments: PaymentRow[];
  taxSummary: { totalAmountCents: number; totalDeductibleAmountCents: number } | null;
};

function money(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export default function AccountPaymentsPage() {
  const [taxYear, setTaxYear] = useState(String(new Date().getUTCFullYear()));
  const [scope, setScope] = useState<"personal" | "household">("personal");
  const [error] = useState("");

  const resource = useResource<PaymentsResponse>(
    (signal) => fetchJson<PaymentsResponse>(`/api/account/payments?taxYear=${encodeURIComponent(taxYear)}`, { signal }),
    [taxYear],
  );

  const rows = useMemo(() => {
    if (!resource.data) return [];
    return scope === "household" && resource.data.familyAdmin
      ? resource.data.familyPayments
      : resource.data.personalPayments;
  }, [resource.data, scope]);

  const columns: DataTableColumn<PaymentRow>[] = [
    {
      id: "paidAt",
      header: "When",
      accessor: (r) => new Date(r.paidAt).toLocaleString(),
      sortValue: (r) => r.paidAt,
      exportValue: (r) => r.paidAt,
    },
    {
      id: "designation",
      header: "Designation",
      accessor: (r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.designation}</div>
          {r.campaignTitle ? (
            <div style={{ fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)" }}>{r.campaignTitle}</div>
          ) : null}
        </div>
      ),
      sortValue: (r) => r.designation,
      exportValue: (r) => r.designation,
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
      id: "deductible",
      header: "Deductible",
      align: "right",
      accessor: (r) => money(r.deductibleAmountCents, r.currency),
      sortValue: (r) => r.deductibleAmountCents,
      exportValue: (r) => r.deductibleAmountCents / 100,
    },
    {
      id: "source",
      header: "Source",
      accessor: (r) => <Badge tone="neutral">{r.source}</Badge>,
      exportValue: (r) => r.source,
      hideOnMobile: true,
    },
    {
      id: "kind",
      header: "Kind",
      accessor: (r) => <Badge tone="info">{r.kind}</Badge>,
      exportValue: (r) => r.kind,
      hideOnMobile: true,
    },
    {
      id: "receipt",
      header: "Receipt",
      accessor: (r) =>
        r.deductibleAmountCents > 0 ? (
          <a href={`/api/account/payments/receipt/${r.id}`} target="_blank" rel="noreferrer noopener">PDF</a>
        ) : (
          "—"
        ),
    },
  ];

  const deductibleCents = resource.data?.taxSummary?.totalDeductibleAmountCents ?? 0;
  const totalCents = resource.data?.taxSummary?.totalAmountCents ?? 0;

  const stats = resource.data
    ? [
        { label: "Payments", value: String(rows.length), hint: scope === "household" ? "Household scope" : "Personal" },
        { label: "Deductible", value: money(deductibleCents), hint: `Tax year ${resource.data.selectedTaxYear}` },
        { label: "Total", value: money(totalCents), hint: "All classifications" },
        {
          label: "Scope",
          value: resource.data.familyAdmin ? "Household available" : "Personal only",
          hint: resource.data.familyAdmin ? "You're a primary adult" : "No household access",
        },
      ]
    : [];

  return (
    <AccountShell
      currentPath="/account/payments"
      title="Payments"
      description="View your full payment history, household visibility when applicable, and download exports."
      stats={stats}
      actions={
        <>
          <Link href="/account/dues">
            <Button size="sm">Renew dues</Button>
          </Link>
          <Link href="/donations">
            <Button size="sm" variant="secondary">Give</Button>
          </Link>
        </>
      }
    >
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <Toolbar>
        <ToolbarFilters>
          <Select value={taxYear} onChange={(e) => setTaxYear(e.target.value)} style={{ minWidth: 120 }}>
            {(resource.data?.availableYears.length ? resource.data.availableYears : [new Date().getUTCFullYear()]).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
          {resource.data?.familyAdmin ? (
            <Select value={scope} onChange={(e) => setScope(e.target.value as "personal" | "household")}>
              <option value="personal">Personal scope</option>
              <option value="household">Household scope</option>
            </Select>
          ) : null}
        </ToolbarFilters>
        <ToolbarActions>
          <a href="/api/account/payments/export?format=csv" style={{ textDecoration: "none" }}>
            <Button size="sm" variant="ghost">Export CSV</Button>
          </a>
          <a href="/api/account/payments/export?format=pdf" style={{ textDecoration: "none" }}>
            <Button size="sm" variant="ghost">Export PDF</Button>
          </a>
          <a href={`/api/account/payments/year-end-letter?taxYear=${encodeURIComponent(taxYear)}`} style={{ textDecoration: "none" }}>
            <Button size="sm" variant="ghost">Year-end letter</Button>
          </a>
          {resource.data?.familyAdmin ? (
            <a href="/api/account/payments/export?format=csv&scope=family" style={{ textDecoration: "none" }}>
              <Button size="sm" variant="ghost">Household CSV</Button>
            </a>
          ) : null}
        </ToolbarActions>
      </Toolbar>

      <Card padded style={{ marginBottom: "var(--bk-space-4)" }}>
        <CardHeader title={`Tax year ${taxYear} summary`} description="Use deductible totals for tax prep." />
        <CardBody>
          <div style={{ display: "flex", gap: "var(--bk-space-6)", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)" }}>Total deductible</div>
              <div style={{ fontSize: "var(--bk-text-2xl)", fontWeight: 700 }}>{money(deductibleCents)}</div>
            </div>
            <div>
              <div style={{ fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)" }}>Total paid</div>
              <div style={{ fontSize: "var(--bk-text-2xl)", fontWeight: 700 }}>{money(totalCents)}</div>
            </div>
          </div>
        </CardBody>
      </Card>

      <DataState resource={resource} empty={{ title: "No payments", description: "No payments recorded yet." }}>
        {() => (
          <DataTable<PaymentRow>
            rows={rows}
            rowId={(r) => r.id}
            columns={columns}
            exportFilename={`payments-${taxYear}-${scope}.csv`}
            emptyState={scope === "household" ? "No household payments visible" : "No personal payments yet"}
          />
        )}
      </DataState>
    </AccountShell>
  );
}
