"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import adminStyles from "@/components/admin/admin-shell.module.css";
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

  const stats = useMemo(() => {
    const sent = logs.filter((log) => log.status === "sent").length;
    const failed = logs.filter((log) => log.status === "failed").length;
    return [
      { label: "Loaded logs", value: String(logs.length), hint: pageInfo?.hasNextPage ? "More available" : "Current result set" },
      { label: "Sent", value: String(sent), hint: "Successful deliveries in loaded rows" },
      { label: "Failed", value: String(failed), hint: "Review provider or template issues" },
    ];
  }, [logs, pageInfo?.hasNextPage]);

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

  async function resetFilters() {
    setQ("");
    setStatusFilter("");
    setSourceFilter("");
    const response = await fetch("/api/admin/messages?limit=25");
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
      return;
    }
    setLogs(payload.items ?? []);
    setSegments(payload.segments ?? []);
    setPageInfo(payload.pageInfo ?? null);
    setLoading(false);
  }

  return (
    <AdminShell
      currentPath="/admin/messages"
      title="Unified Messages"
      description="Run quick outbound campaigns and review delivery history from one log."
      stats={stats}
      actions={<Link href="/admin/templates" className={adminStyles.actionPill}>Open templates</Link>}
    >

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

      <section className={adminStyles.toolbar}>
        <div className={adminStyles.toolbarHeader}>
          <p className={adminStyles.toolbarTitle}>Log filters</p>
          <p className={adminStyles.toolbarMeta}>Search recipients, filter by source, and isolate failures quickly.</p>
        </div>
        <div className={adminStyles.toolbarFields}>
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
        </div>
        <div className={adminStyles.toolbarActions}>
          <button type="button" className={adminStyles.primaryButton} onClick={() => loadLogs({ reset: true })}>
            Apply filters
          </button>
          <button type="button" className={adminStyles.secondaryButton} onClick={() => void resetFilters()}>
            Clear filters
          </button>
        </div>
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
    </AdminShell>
  );
}
