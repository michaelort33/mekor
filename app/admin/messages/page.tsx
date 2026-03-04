"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./page.module.css";

type MessageLog = {
  id: number;
  userId: number;
  userEmail: string;
  userDisplayName: string;
  messageType: "membership_renewal_reminder";
  membershipRenewalDate: string;
  recipientEmail: string;
  subject: string;
  provider: string;
  providerMessageId: string;
  deliveryStatus: "sent" | "failed";
  errorMessage: string;
  sentAt: string | null;
  createdAt: string;
};

type PageInfo = {
  nextCursor: string | null;
  hasNextPage: boolean;
  limit: number;
};

export default function AdminMessagesPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "sent" | "failed">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);

  async function loadLogs(options?: { reset?: boolean; cursor?: string | null }) {
    setError("");
    if (options?.reset) {
      setLoading(true);
      setLogs([]);
      setPageInfo(null);
    }

    const params = new URLSearchParams();
    params.set("limit", "25");
    if (q.trim()) params.set("q", q.trim());
    if (statusFilter) params.set("status", statusFilter);
    if (options?.cursor) params.set("cursor", options.cursor);

    const response = await fetch(`/api/admin/messages?${params.toString()}`);
    if (response.status === 401) {
      router.push("/login?next=/admin/messages");
      return;
    }

    const data = (await response.json().catch(() => ({}))) as {
      items?: MessageLog[];
      pageInfo?: PageInfo;
      error?: string;
    };

    if (!response.ok) {
      setError(data.error || "Unable to load message logs");
      setLoading(false);
      return;
    }

    setLogs((prev) => (options?.reset ? data.items ?? [] : [...prev, ...(data.items ?? [])]));
    setPageInfo(data.pageInfo ?? null);
    setLoading(false);
  }

  useEffect(() => {
    loadLogs({ reset: true }).catch(() => {
      setError("Unable to load message logs");
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Automated Message Logs</h1>
          <p>Review membership renewal reminders and delivery status.</p>
        </div>
        <div className={styles.links}>
          <Link href="/admin/users">Users admin</Link>
          <Link href="/admin/dues">Dues admin</Link>
          <Link href="/admin/events">Events admin</Link>
          <Link href="/admin/settings">Settings</Link>
        </div>
      </header>

      <section className={styles.filters}>
        <label>
          Search
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Name, email, subject"
          />
        </label>
        <label>
          Status
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "" | "sent" | "failed")}
          >
            <option value="">All</option>
            <option value="sent">sent</option>
            <option value="failed">failed</option>
          </select>
        </label>
        <button type="button" onClick={() => loadLogs({ reset: true })}>
          Apply
        </button>
      </section>

      {error ? <p className={styles.error}>{error}</p> : null}

      {loading ? (
        <p>Loading logs...</p>
      ) : (
        <>
          <section className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Created</th>
                  <th>User</th>
                  <th>Type</th>
                  <th>Renewal date</th>
                  <th>Status</th>
                  <th>Subject</th>
                  <th>Provider</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>
                      {log.userDisplayName}
                      <br />
                      {log.userEmail}
                    </td>
                    <td>{log.messageType}</td>
                    <td>{log.membershipRenewalDate}</td>
                    <td>{log.deliveryStatus}</td>
                    <td>{log.subject}</td>
                    <td>{log.provider}</td>
                    <td>{log.errorMessage || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {pageInfo?.hasNextPage && pageInfo.nextCursor ? (
            <div className={styles.loadMoreWrap}>
              <button type="button" onClick={() => loadLogs({ cursor: pageInfo.nextCursor })}>
                Load more
              </button>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}
