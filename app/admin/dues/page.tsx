"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import adminStyles from "@/components/admin/admin-shell.module.css";
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

type UserBalance = {
  id: number;
  email: string;
  displayName: string;
  outstandingBalanceCents: number;
};

type PageInfo = {
  nextCursor: string | null;
  hasNextPage: boolean;
  limit: number;
};

type ScheduleRunResult = {
  createdInvoices: number;
  deduped: number;
  notificationsSent: number;
  notificationsFailed: number;
  advancedSchedules: number;
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export default function AdminDuesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<"" | Invoice["status"]>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [users, setUsers] = useState<UserBalance[]>([]);
  const [schedulesPageInfo, setSchedulesPageInfo] = useState<PageInfo | null>(null);
  const [invoicesPageInfo, setInvoicesPageInfo] = useState<PageInfo | null>(null);
  const [invoiceForm, setInvoiceForm] = useState({
    userId: "",
    label: "Membership dues",
    amountCents: "",
    dueDate: "",
  });
  const [scheduleForm, setScheduleForm] = useState({
    userId: "",
    frequency: "monthly" as "annual" | "monthly" | "custom",
    amountCents: "",
    nextDueDate: "",
    notes: "",
    active: true,
  });
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [runningSchedules, setRunningSchedules] = useState(false);
  const [runNotice, setRunNotice] = useState("");

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) => [user.displayName, user.email].some((value) => value.toLowerCase().includes(term)));
  }, [search, users]);

  const filteredSchedules = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return schedules;
    return schedules.filter((schedule) => [schedule.userDisplayName, schedule.userEmail, schedule.notes].some((value) => value.toLowerCase().includes(term)));
  }, [schedules, search]);

  const filteredInvoices = useMemo(() => {
    const term = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      if (invoiceStatusFilter && invoice.status !== invoiceStatusFilter) return false;
      if (!term) return true;
      return [invoice.userDisplayName, invoice.userEmail, invoice.label].some((value) => value.toLowerCase().includes(term));
    });
  }, [invoiceStatusFilter, invoices, search]);

  const stats = useMemo(() => {
    const activeSchedules = schedules.filter((schedule) => schedule.active).length;
    const openInvoices = invoices.filter((invoice) => invoice.status === "open" || invoice.status === "overdue");
    const totalOutstanding = users.reduce((sum, user) => sum + user.outstandingBalanceCents, 0);
    return [
      { label: "Outstanding", value: formatMoney(totalOutstanding, "usd"), hint: `${openInvoices.length} open/overdue invoices loaded` },
      { label: "Schedules", value: String(schedules.length), hint: `${activeSchedules} active` },
      { label: "Visible rows", value: String(filteredUsers.length + filteredSchedules.length + filteredInvoices.length), hint: "Across summaries, schedules, and invoices" },
    ];
  }, [filteredInvoices.length, filteredSchedules.length, filteredUsers.length, invoices, schedules, users]);

  async function load(options?: { reset?: boolean; schedulesCursor?: string | null; invoicesCursor?: string | null }) {
    setLoading(true);
    setError("");

    const schedulesParams = new URLSearchParams();
    schedulesParams.set("limit", "25");
    if (options?.schedulesCursor) schedulesParams.set("cursor", options.schedulesCursor);

    const invoicesParams = new URLSearchParams();
    invoicesParams.set("limit", "25");
    if (options?.invoicesCursor) invoicesParams.set("cursor", options.invoicesCursor);

    const [schedulesResponse, invoicesResponse, usersResponse] = await Promise.all([
      fetch(`/api/admin/dues/schedules?${schedulesParams.toString()}`),
      fetch(`/api/admin/dues/invoices?${invoicesParams.toString()}`),
      fetch("/api/admin/users?limit=100"),
    ]);

    if (schedulesResponse.status === 401 || invoicesResponse.status === 401 || usersResponse.status === 401) {
      router.push("/login?next=/admin/dues");
      return;
    }

    const schedulesPayload = (await schedulesResponse.json().catch(() => ({}))) as {
      items?: Schedule[];
      pageInfo?: PageInfo;
      error?: string;
    };
    const invoicesPayload = (await invoicesResponse.json().catch(() => ({}))) as {
      items?: Invoice[];
      pageInfo?: PageInfo;
      error?: string;
    };
    const usersPayload = (await usersResponse.json().catch(() => ({}))) as {
      items?: UserBalance[];
      error?: string;
    };

    if (!schedulesResponse.ok || !invoicesResponse.ok || !usersResponse.ok) {
      setError(schedulesPayload.error || invoicesPayload.error || usersPayload.error || "Unable to load dues admin data");
      setLoading(false);
      return;
    }

    setSchedules((prev) => {
      if (options?.schedulesCursor) return [...prev, ...(schedulesPayload.items ?? [])];
      if (options?.invoicesCursor && !options?.reset) return prev;
      return schedulesPayload.items ?? [];
    });
    setInvoices((prev) => {
      if (options?.invoicesCursor) return [...prev, ...(invoicesPayload.items ?? [])];
      if (options?.schedulesCursor && !options?.reset) return prev;
      return invoicesPayload.items ?? [];
    });
    setUsers(usersPayload.items ?? []);
    setSchedulesPageInfo(schedulesPayload.pageInfo ?? null);
    setInvoicesPageInfo(invoicesPayload.pageInfo ?? null);
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

    await load({ reset: true });
  }

  async function createInvoice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const userId = Number.parseInt(invoiceForm.userId, 10);
    const amountCents = Number.parseInt(invoiceForm.amountCents, 10);
    if (!Number.isInteger(userId) || userId < 1 || !Number.isInteger(amountCents) || amountCents < 1) {
      setError("Choose a user and enter a valid amount in cents.");
      return;
    }
    if (!invoiceForm.dueDate) {
      setError("Due date is required.");
      return;
    }

    setSavingInvoice(true);
    const response = await fetch(`/api/admin/users/${userId}/dues-balance`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        createInvoice: {
          label: invoiceForm.label,
          amountCents,
          dueDate: invoiceForm.dueDate,
          currency: "usd",
        },
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error || "Unable to create invoice");
      setSavingInvoice(false);
      return;
    }
    setInvoiceForm((prev) => ({
      ...prev,
      amountCents: "",
      dueDate: "",
    }));
    setSavingInvoice(false);
    await load({ reset: true });
  }

  async function createSchedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setRunNotice("");

    const userId = Number.parseInt(scheduleForm.userId, 10);
    const amountCents = Number.parseInt(scheduleForm.amountCents, 10);
    if (!Number.isInteger(userId) || userId < 1 || !Number.isInteger(amountCents) || amountCents < 1) {
      setError("Choose a user and enter a valid schedule amount in cents.");
      return;
    }
    if (!scheduleForm.nextDueDate) {
      setError("Schedule next due date is required.");
      return;
    }

    setSavingSchedule(true);
    const response = await fetch("/api/admin/dues/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        frequency: scheduleForm.frequency,
        amountCents,
        currency: "usd",
        nextDueDate: scheduleForm.nextDueDate,
        active: scheduleForm.active,
        notes: scheduleForm.notes,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error || "Unable to create schedule");
      setSavingSchedule(false);
      return;
    }

    setScheduleForm((prev) => ({
      ...prev,
      amountCents: "",
      nextDueDate: "",
      notes: "",
    }));
    setSavingSchedule(false);
    await load({ reset: true });
  }

  async function runScheduleInvoicing() {
    setError("");
    setRunNotice("");
    setRunningSchedules(true);

    const response = await fetch("/api/admin/dues/schedules/generate", { method: "POST" });
    const payload = (await response.json().catch(() => ({}))) as ScheduleRunResult & { error?: string };
    if (!response.ok) {
      setError(payload.error || "Unable to run schedule invoicing");
      setRunningSchedules(false);
      return;
    }

    setRunNotice(
      `Created ${payload.createdInvoices} invoice(s), advanced ${payload.advancedSchedules} schedule(s), sent ${payload.notificationsSent} notification(s).`,
    );
    setRunningSchedules(false);
    await load({ reset: true });
  }

  useEffect(() => {
    load({ reset: true }).catch(() => {
      setError("Unable to load dues admin data");
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return (
    <AdminShell
      currentPath="/admin/dues"
      title="Dues Admin"
      description="Manage balances, schedules, invoices, and manual billing tasks from one screen."
      stats={stats}
      actions={<Link href="/admin/users" className={adminStyles.actionPill}>Open users</Link>}
    >

      <section className={adminStyles.toolbar}>
        <div className={adminStyles.toolbarHeader}>
          <p className={adminStyles.toolbarTitle}>Dues filters</p>
          <p className={adminStyles.toolbarMeta}>Search by user or label and isolate invoice states quickly.</p>
        </div>
        <div className={adminStyles.toolbarFields}>
          <label>
            Search
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="User, email, invoice label" />
          </label>
          <label>
            Invoice status
            <select value={invoiceStatusFilter} onChange={(event) => setInvoiceStatusFilter(event.target.value as "" | Invoice["status"])}>
              <option value="">All</option>
              <option value="open">open</option>
              <option value="overdue">overdue</option>
              <option value="paid">paid</option>
              <option value="void">void</option>
            </select>
          </label>
        </div>
        <div className={adminStyles.toolbarActions}>
          <button type="button" className={adminStyles.secondaryButton} onClick={() => {
            setSearch("");
            setInvoiceStatusFilter("");
          }}>
            Clear filters
          </button>
        </div>
      </section>

      {error ? <p className={styles.error}>{error}</p> : null}

      {loading ? <p>Loading dues data...</p> : null}

      {!loading ? (
        <>
          <section className={`${styles.card} internal-card`}>
            <h2>User balance summary</h2>
            {filteredUsers.length === 0 ? (
              <p>No users found.</p>
            ) : (
              <ul className={styles.list}>
                {filteredUsers.map((user) => (
                  <li key={user.id} className={styles.listItem}>
                    <strong>{user.displayName}</strong>
                    <p>{user.email}</p>
                    <p>{formatMoney(user.outstandingBalanceCents, "usd")} outstanding</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={`${styles.card} internal-card`}>
            <h2>Add invoice</h2>
            <form className={styles.formGrid} onSubmit={createInvoice}>
              <label>
                User
                <select
                  value={invoiceForm.userId}
                  onChange={(event) => setInvoiceForm((prev) => ({ ...prev, userId: event.target.value }))}
                  required
                >
                  <option value="">Select user</option>
                  {filteredUsers.map((user) => (
                    <option key={user.id} value={String(user.id)}>
                      {user.displayName} ({user.email})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Label
                <input
                  value={invoiceForm.label}
                  onChange={(event) => setInvoiceForm((prev) => ({ ...prev, label: event.target.value }))}
                  required
                />
              </label>
              <label>
                Amount (cents)
                <input
                  type="number"
                  min={1}
                  value={invoiceForm.amountCents}
                  onChange={(event) => setInvoiceForm((prev) => ({ ...prev, amountCents: event.target.value }))}
                  required
                />
              </label>
              <label>
                Due date
                <input
                  type="date"
                  value={invoiceForm.dueDate}
                  onChange={(event) => setInvoiceForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                  required
                />
              </label>
              <button type="submit" disabled={savingInvoice}>
                {savingInvoice ? "Saving..." : "Create invoice"}
              </button>
            </form>
          </section>

          <section className={`${styles.card} internal-card`}>
            <h2>Add schedule</h2>
            <form className={styles.formGrid} onSubmit={createSchedule}>
              <label>
                User
                <select
                  value={scheduleForm.userId}
                  onChange={(event) => setScheduleForm((prev) => ({ ...prev, userId: event.target.value }))}
                  required
                >
                  <option value="">Select user</option>
                  {filteredUsers.map((user) => (
                    <option key={user.id} value={String(user.id)}>
                      {user.displayName} ({user.email})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Frequency
                <select
                  value={scheduleForm.frequency}
                  onChange={(event) =>
                    setScheduleForm((prev) => ({
                      ...prev,
                      frequency: event.target.value as "annual" | "monthly" | "custom",
                    }))
                  }
                >
                  <option value="monthly">monthly</option>
                  <option value="annual">annual</option>
                  <option value="custom">custom</option>
                </select>
              </label>
              <label>
                Amount (cents)
                <input
                  type="number"
                  min={1}
                  value={scheduleForm.amountCents}
                  onChange={(event) => setScheduleForm((prev) => ({ ...prev, amountCents: event.target.value }))}
                  required
                />
              </label>
              <label>
                Next due date
                <input
                  type="date"
                  value={scheduleForm.nextDueDate}
                  onChange={(event) => setScheduleForm((prev) => ({ ...prev, nextDueDate: event.target.value }))}
                  required
                />
              </label>
              <label>
                Notes
                <input
                  value={scheduleForm.notes}
                  onChange={(event) => setScheduleForm((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </label>
              <label>
                Active
                <select
                  value={scheduleForm.active ? "true" : "false"}
                  onChange={(event) => setScheduleForm((prev) => ({ ...prev, active: event.target.value === "true" }))}
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              </label>
              <button type="submit" disabled={savingSchedule}>
                {savingSchedule ? "Saving..." : "Create schedule"}
              </button>
            </form>
          </section>

          <section className={`${styles.card} internal-card`}>
            <div className={styles.scheduleHeader}>
              <h2>Schedules</h2>
              <button type="button" onClick={runScheduleInvoicing} disabled={runningSchedules}>
                {runningSchedules ? "Running..." : "Generate invoices from schedules"}
              </button>
            </div>
            {runNotice ? <p className={styles.notice}>{runNotice}</p> : null}
            {filteredSchedules.length === 0 ? (
              <p>No schedules created.</p>
            ) : (
              <>
                <ul className={styles.list}>
                  {filteredSchedules.map((schedule) => (
                    <li key={schedule.id} className={styles.listItem}>
                      <strong>{schedule.userDisplayName}</strong>
                      <p>
                        {schedule.frequency} · {formatMoney(schedule.amountCents, schedule.currency)} · due {schedule.nextDueDate}
                      </p>
                      <p>{schedule.active ? "active" : "inactive"}</p>
                    </li>
                  ))}
                </ul>
                {schedulesPageInfo?.hasNextPage && schedulesPageInfo.nextCursor ? (
                  <div className={styles.loadMoreWrap}>
                    <button type="button" onClick={() => load({ schedulesCursor: schedulesPageInfo.nextCursor })}>
                      Load more schedules
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </section>

          <section className={`${styles.card} internal-card`}>
            <h2>Invoices</h2>
            {filteredInvoices.length === 0 ? (
              <p>No invoices found.</p>
            ) : (
              <>
                <ul className={styles.list}>
                  {filteredInvoices.map((invoice) => (
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
                {invoicesPageInfo?.hasNextPage && invoicesPageInfo.nextCursor ? (
                  <div className={styles.loadMoreWrap}>
                    <button type="button" onClick={() => load({ invoicesCursor: invoicesPageInfo.nextCursor })}>
                      Load more invoices
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </section>
        </>
      ) : null}
    </AdminShell>
  );
}
