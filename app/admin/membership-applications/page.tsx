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

type ApplicationStatus = "pending" | "approved" | "declined";

type Application = {
  id: number;
  status: ApplicationStatus;
  applicationType: string;
  membershipCategory: string;
  preferredPaymentMethod: string;
  totalAmountCents: number;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string;
  reviewNotes: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
};

type ListResponse = { items: Application[] };

const STATUS_TONES: Record<ApplicationStatus, BadgeTone> = {
  pending: "warning",
  approved: "success",
  declined: "neutral",
};

const dollars = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

function today() {
  return new Date().toISOString().slice(0, 10);
}

function yearFromToday() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export default function AdminMembershipApplicationsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | ApplicationStatus>("pending");
  const [reviewing, setReviewing] = useState<Application | null>(null);

  const resource = useResource<ListResponse>(
    (signal) => {
      const sp = new URLSearchParams();
      if (q) sp.set("q", q);
      if (status) sp.set("status", status);
      return fetchJson<ListResponse>(`/api/admin/membership-applications?${sp.toString()}`, { signal });
    },
    [q, status],
  );

  const items = resource.data?.items ?? [];

  const stats = useMemo(() => {
    const pending = items.filter((a) => a.status === "pending").length;
    const approved = items.filter((a) => a.status === "approved").length;
    const declined = items.filter((a) => a.status === "declined").length;
    return [
      { label: "Loaded applications", value: String(items.length), hint: "Current filter" },
      { label: "Pending", value: String(pending), hint: "Awaiting review" },
      { label: "Approved", value: String(approved), hint: `${declined} declined` },
    ];
  }, [items]);

  const columns: DataTableColumn<Application>[] = [
    {
      id: "name",
      header: "Applicant",
      accessor: (a) => (
        <div>
          <div style={{ fontWeight: 700 }}>{a.displayName || `${a.firstName} ${a.lastName}`}</div>
          <div style={{ fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)" }}>{a.email}</div>
        </div>
      ),
      sortValue: (a) => (a.displayName || `${a.firstName} ${a.lastName}`).toLowerCase(),
      exportValue: (a) => `${a.displayName} <${a.email}>`,
    },
    {
      id: "category",
      header: "Membership",
      accessor: (a) => (
        <div>
          <div>{a.membershipCategory}</div>
          <div style={{ fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)" }}>{a.applicationType}</div>
        </div>
      ),
      exportValue: (a) => `${a.membershipCategory} / ${a.applicationType}`,
      hideOnMobile: true,
    },
    {
      id: "amount",
      header: "Amount",
      accessor: (a) => <strong>{dollars(a.totalAmountCents)}</strong>,
      sortValue: (a) => a.totalAmountCents,
      exportValue: (a) => (a.totalAmountCents / 100).toFixed(2),
      align: "right",
    },
    {
      id: "status",
      header: "Status",
      accessor: (a) => <Badge tone={STATUS_TONES[a.status]}>{a.status}</Badge>,
      sortValue: (a) => a.status,
      exportValue: (a) => a.status,
    },
    {
      id: "submitted",
      header: "Submitted",
      accessor: (a) => new Date(a.createdAt).toLocaleDateString(),
      sortValue: (a) => a.createdAt,
      exportValue: (a) => a.createdAt,
      hideOnMobile: true,
    },
  ];

  return (
    <AdminShell
      currentPath="/admin/membership-applications"
      title="Membership applications"
      description="Review and approve applicants. Approval generates invoices/schedules and seeds member records."
      stats={stats}
    >
      <Toolbar>
        <ToolbarSearch value={q} onChange={setQ} placeholder="Search by name, email, or phone…" />
        <ToolbarFilters>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as ApplicationStatus | "")}
            style={{ minWidth: 140 }}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="declined">Declined</option>
          </Select>
          {(q || status) ? <FilterChip label="Clear filters" onRemove={() => { setQ(""); setStatus(""); }} /> : null}
        </ToolbarFilters>
        <ToolbarActions>
          <Button variant="ghost" size="sm" onClick={() => void resource.refresh()}>
            Refresh
          </Button>
        </ToolbarActions>
      </Toolbar>

      <DataState resource={resource} empty={{ title: "No applications", description: "No applicants match your filters yet." }}>
        {() => (
          <DataTable<Application>
            rows={items}
            rowId={(a) => a.id}
            columns={columns}
            rowActions={(a) => (
              <Button size="sm" variant="ghost" onClick={() => setReviewing(a)}>
                {a.status === "pending" ? "Review" : "Details"}
              </Button>
            )}
            exportFilename="membership-applications.csv"
            emptyState="No applications match"
          />
        )}
      </DataState>

      <Modal
        open={!!reviewing}
        onClose={() => setReviewing(null)}
        title={reviewing ? `Review ${reviewing.displayName || reviewing.email}` : "Review"}
        description="Approve with a billing plan or decline with a note."
        size="lg"
      >
        {reviewing ? (
          <ReviewForm
            application={reviewing}
            onDone={() => {
              setReviewing(null);
              void resource.refresh();
            }}
          />
        ) : null}
      </Modal>
    </AdminShell>
  );
}

function ReviewForm({ application, onDone }: { application: Application; onDone: () => void }) {
  const [mode, setMode] = useState<"approve" | "decline">("approve");
  const [reviewNotes, setReviewNotes] = useState(application.reviewNotes ?? "");
  const [billingMode, setBillingMode] = useState<"invoice" | "schedule" | "none">("invoice");
  const [startDate, setStartDate] = useState(today());
  const [renewalDate, setRenewalDate] = useState(yearFromToday());
  const [invoiceLabel, setInvoiceLabel] = useState(`Membership dues ${application.membershipCategory}`);
  const [invoiceAmount, setInvoiceAmount] = useState((application.totalAmountCents / 100).toString());
  const [invoiceDue, setInvoiceDue] = useState(yearFromToday());
  const [scheduleFreq, setScheduleFreq] = useState<"annual" | "monthly" | "custom">("annual");
  const [scheduleAmount, setScheduleAmount] = useState((application.totalAmountCents / 100).toString());
  const [scheduleNext, setScheduleNext] = useState(yearFromToday());
  const [createSpouseLead, setCreateSpouseLead] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPending = application.status === "pending";

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "decline") {
        await fetchJson(`/api/admin/membership-applications/${application.id}/decline`, {
          method: "POST",
          body: JSON.stringify({ reviewNotes }),
        });
      } else {
        const invCents = Math.round(Number(invoiceAmount) * 100);
        const schCents = Math.round(Number(scheduleAmount) * 100);
        await fetchJson(`/api/admin/membership-applications/${application.id}/approve`, {
          method: "POST",
          body: JSON.stringify({
            reviewNotes,
            approvalPlan: {
              membershipStartDate: startDate,
              membershipRenewalDate: renewalDate,
              billingMode,
              invoiceLabel,
              invoiceAmountCents: invCents,
              invoiceDueDate: invoiceDue,
              scheduleFrequency: scheduleFreq,
              scheduleAmountCents: schCents,
              scheduleNextDueDate: scheduleNext,
              scheduleNotes: "",
              createSpouseLead,
            },
          }),
        });
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--bk-space-3)" }}>
      <div style={{ background: "var(--bk-surface-soft)", padding: "var(--bk-space-3)", borderRadius: "var(--bk-radius-md)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--bk-space-2)" }}>
        <div><strong>Email:</strong> {application.email}</div>
        <div><strong>Phone:</strong> {application.phone || "—"}</div>
        <div><strong>Type:</strong> {application.applicationType}</div>
        <div><strong>Category:</strong> {application.membershipCategory}</div>
        <div><strong>Payment method:</strong> {application.preferredPaymentMethod}</div>
        <div><strong>Amount:</strong> {dollars(application.totalAmountCents)}</div>
      </div>

      {isPending ? (
        <div style={{ display: "flex", gap: "var(--bk-space-2)" }}>
          <Button type="button" variant={mode === "approve" ? undefined : "ghost"} size="sm" onClick={() => setMode("approve")}>
            Approve
          </Button>
          <Button type="button" variant={mode === "decline" ? undefined : "ghost"} size="sm" onClick={() => setMode("decline")}>
            Decline
          </Button>
        </div>
      ) : (
        <div style={{ fontSize: "var(--bk-text-sm)", color: "var(--bk-text-soft)" }}>
          Already {application.status}.
        </div>
      )}

      {isPending && mode === "approve" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--bk-space-3)" }}>
            <Field label="Membership start" required>
              {(props) => <Input {...props} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />}
            </Field>
            <Field label="Membership renewal" required>
              {(props) => <Input {...props} type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} />}
            </Field>
          </div>
          <Field label="Billing">
            {(props) => (
              <Select {...props} value={billingMode} onChange={(e) => setBillingMode(e.target.value as "invoice" | "schedule" | "none")}>
                <option value="invoice">One-time invoice</option>
                <option value="schedule">Recurring schedule</option>
                <option value="none">None</option>
              </Select>
            )}
          </Field>
          {billingMode === "invoice" ? (
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "var(--bk-space-3)" }}>
              <Field label="Invoice label">
                {(props) => <Input {...props} value={invoiceLabel} onChange={(e) => setInvoiceLabel(e.target.value)} />}
              </Field>
              <Field label="Amount (USD)">
                {(props) => <Input {...props} inputMode="decimal" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} />}
              </Field>
              <Field label="Due date">
                {(props) => <Input {...props} type="date" value={invoiceDue} onChange={(e) => setInvoiceDue(e.target.value)} />}
              </Field>
            </div>
          ) : null}
          {billingMode === "schedule" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--bk-space-3)" }}>
              <Field label="Frequency">
                {(props) => (
                  <Select {...props} value={scheduleFreq} onChange={(e) => setScheduleFreq(e.target.value as typeof scheduleFreq)}>
                    <option value="annual">Annual</option>
                    <option value="monthly">Monthly</option>
                    <option value="custom">Custom</option>
                  </Select>
                )}
              </Field>
              <Field label="Amount (USD)">
                {(props) => <Input {...props} inputMode="decimal" value={scheduleAmount} onChange={(e) => setScheduleAmount(e.target.value)} />}
              </Field>
              <Field label="Next due">
                {(props) => <Input {...props} type="date" value={scheduleNext} onChange={(e) => setScheduleNext(e.target.value)} />}
              </Field>
            </div>
          ) : null}
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={createSpouseLead} onChange={(e) => setCreateSpouseLead(e.target.checked)} />
            <span>Create spouse as lead in CRM</span>
          </label>
        </>
      ) : null}

      <Field label="Review notes" hint="Internal notes. Visible to admins only.">
        {(props) => (
          <textarea
            id={props.id}
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            rows={3}
            style={{
              width: "100%",
              fontFamily: "inherit",
              fontSize: "var(--bk-text-sm)",
              padding: "var(--bk-space-2)",
              background: "var(--bk-surface)",
              border: "1px solid var(--bk-border)",
              borderRadius: "var(--bk-radius-sm)",
              color: "var(--bk-text)",
            }}
          />
        )}
      </Field>

      {error ? <p style={{ color: "var(--bk-danger)", margin: 0, fontSize: "var(--bk-text-sm)" }}>{error}</p> : null}

      {isPending ? (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--bk-space-2)" }}>
          <Button type="button" onClick={submit} disabled={submitting}>
            {submitting ? "Saving…" : mode === "approve" ? "Approve application" : "Decline application"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
