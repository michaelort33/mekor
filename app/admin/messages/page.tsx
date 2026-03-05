"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./page.module.css";

type LogItem = {
  id: string;
  source: "manual" | "newsletter" | "automated" | "dues";
  channel: "email";
  recipientName: string;
  recipientEmail: string;
  subject: string;
  provider: string;
  providerMessageId: string;
  status: "sent" | "failed" | "skipped";
  errorMessage: string;
  createdAt: string;
  sentAt: string | null;
  actorEmail: string;
  campaignName: string;
  segmentLabel: string;
};

type Segment = {
  key: "all_people" | "prospects" | "invited_not_accepted" | "active_members" | "members_overdue";
  label: string;
};

const DEFAULT_SEGMENTS: Segment[] = [
  { key: "active_members", label: "Active members/admins" },
  { key: "members_overdue", label: "Members with overdue/open dues" },
  { key: "invited_not_accepted", label: "Invited, not onboarded" },
  { key: "prospects", label: "Prospects (leads)" },
  { key: "all_people", label: "All people" },
];

type PageInfo = {
  nextCursor: string | null;
  hasNextPage: boolean;
  limit: number;
};

export default function AdminMessagesPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "sent" | "failed" | "skipped">("");
  const [sourceFilter, setSourceFilter] = useState<"" | "manual" | "newsletter" | "automated" | "dues">("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [campaignName, setCampaignName] = useState("Member Update");
  const [campaignSegment, setCampaignSegment] = useState<Segment["key"]>("active_members");
  const [campaignSubject, setCampaignSubject] = useState("");
  const [campaignBody, setCampaignBody] = useState("");
  const availableSegments = segments.length > 0 ? segments : DEFAULT_SEGMENTS;

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
    if (sourceFilter) params.set("source", sourceFilter);
    if (options?.cursor) params.set("cursor", options.cursor);

    const response = await fetch(`/api/admin/messages?${params.toString()}`);
    if (response.status === 401) {
      router.push("/login?next=/admin/messages");
      return;
    }

    const payload = (await response.json().catch(() => ({}))) as {
      items?: LogItem[];
      pageInfo?: PageInfo;
      segments?: Segment[];
      error?: string;
    };
    if (!response.ok) {
      setError(payload.error || "Unable to load message logs");
      setLoading(false);
      return;
    }

    setLogs((prev) => (options?.reset ? payload.items ?? [] : [...prev, ...(payload.items ?? [])]));
    setSegments(payload.segments ?? []);
    setPageInfo(payload.pageInfo ?? null);
    setLoading(false);
  }

  useEffect(() => {
    loadLogs({ reset: true }).catch(() => {
      setError("Unable to load message logs");
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runCampaign(mode: "preview" | "send") {
    setWorking(true);
    setError("");
    setNotice("");

    const response = await fetch("/api/admin/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        channel: "email",
        name: campaignName,
        subject: campaignSubject,
        body: campaignBody,
        segmentKey: campaignSegment,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      recipientCount?: number;
      successCount?: number;
      failedCount?: number;
      skippedCount?: number;
      status?: string;
    };
    setWorking(false);
    if (!response.ok) {
      setError(payload.error || "Unable to run campaign");
      return;
    }

    if (mode === "preview") {
      setNotice(`Preview ready for ${payload.recipientCount ?? 0} recipients.`);
      return;
    }
    setNotice(
      `Campaign sent. Success: ${payload.successCount ?? 0}, failed: ${payload.failedCount ?? 0}, skipped: ${payload.skippedCount ?? 0}.`,
    );
    await loadLogs({ reset: true });
  }

  return (
    <main className={`${styles.page} internal-page`}>
      <header className={`${styles.header} internal-header`}>
        <div>
          <h1>Unified Messages</h1>
          <p>Campaigns, newsletters, dues reminders, and automated sends in one log.</p>
        </div>
        <div className={`${styles.links} internal-actions`}>
          <Link href="/admin/people">People</Link>
          <Link href="/admin/users">Users</Link>
          <Link href="/admin/dues">Dues</Link>
          <Link href="/admin/events">Events</Link>
        </div>
      </header>

      <section className={styles.compose}>
        <h2>Quick campaign</h2>
        <div className={styles.composeGrid}>
          <label>
            Campaign name
            <input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} />
          </label>
          <label>
            Segment
            <select value={campaignSegment} onChange={(event) => setCampaignSegment(event.target.value as Segment["key"])}>
              {availableSegments.map((segment) => (
                <option key={segment.key} value={segment.key}>
                  {segment.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.fullWidth}>
            Subject
            <input value={campaignSubject} onChange={(event) => setCampaignSubject(event.target.value)} />
          </label>
          <label className={styles.fullWidth}>
            Message body
            <textarea value={campaignBody} onChange={(event) => setCampaignBody(event.target.value)} rows={5} />
          </label>
        </div>
        <div className={styles.composeActions}>
          <button type="button" onClick={() => runCampaign("preview")} disabled={working}>
            Preview recipients
          </button>
          <button type="button" onClick={() => runCampaign("send")} disabled={working}>
            Send campaign
          </button>
        </div>
      </section>

      <section className={styles.filters}>
        <label>
          Search
          <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Name, email, subject" />
        </label>
        <label>
          Source
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as typeof sourceFilter)}>
            <option value="">All</option>
            <option value="manual">manual</option>
            <option value="newsletter">newsletter</option>
            <option value="automated">automated</option>
            <option value="dues">dues</option>
          </select>
        </label>
        <label>
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            <option value="">All</option>
            <option value="sent">sent</option>
            <option value="failed">failed</option>
            <option value="skipped">skipped</option>
          </select>
        </label>
        <button type="button" onClick={() => loadLogs({ reset: true })}>
          Apply
        </button>
      </section>

      {error ? <p className={styles.error}>{error}</p> : null}
      {notice ? <p className={styles.notice}>{notice}</p> : null}

      {loading ? (
        <p>Loading logs...</p>
      ) : (
        <>
          <section className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Source</th>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Campaign</th>
                  <th>Actor</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>{log.source}</td>
                    <td>
                      {log.recipientName}
                      <br />
                      {log.recipientEmail}
                    </td>
                    <td>{log.subject}</td>
                    <td>{log.status}</td>
                    <td>
                      {log.campaignName}
                      <br />
                      <small>{log.segmentLabel}</small>
                    </td>
                    <td>{log.actorEmail}</td>
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
