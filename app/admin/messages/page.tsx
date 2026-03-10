"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import adminStyles from "@/components/admin/admin-shell.module.css";
import { buildSendFeedback } from "@/lib/admin/send-feedback";
import styles from "./page.module.css";

type LogItem = {
  id: string;
  direction: "inbound" | "outbound";
  source: "manual" | "newsletter" | "automated" | "dues" | "form_submission" | "mailchimp_signup";
  channel: "email";
  status: "new" | "read" | "archived" | "sent" | "failed" | "skipped";
  recipientName: string;
  recipientEmail: string;
  subject: string;
  provider: string;
  providerMessageId: string;
  errorMessage: string;
  createdAt: string;
  sentAt: string | null;
  actorEmail: string;
  campaignName: string;
  segmentLabel: string;
  category: string;
  summary: string;
  payloadJson: Record<string, unknown>;
  sourceRecordLabel: string;
  sourceRecordHref: string;
};

type Segment = {
  key: "all_people" | "prospects" | "invited_not_accepted" | "active_members" | "members_overdue";
  label: string;
};

type NotificationPreference = {
  category: string;
  label: string;
  enabled: boolean;
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
  const searchParams = useSearchParams();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [directionFilter, setDirectionFilter] = useState<"" | "inbound" | "outbound">(
    (searchParams.get("direction") as "" | "inbound" | "outbound") || "",
  );
  const [categoryFilter, setCategoryFilter] = useState("");
  const [focusedInboundId, setFocusedInboundId] = useState(searchParams.get("id") ?? "");
  const [selectedItemId, setSelectedItemId] = useState(searchParams.get("id") ? `inbound:${searchParams.get("id")}` : "");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreference[] | null>(null);
  const [campaignName, setCampaignName] = useState("Member Update");
  const [campaignSegment, setCampaignSegment] = useState<Segment["key"]>("active_members");
  const [campaignSubject, setCampaignSubject] = useState("");
  const [campaignBody, setCampaignBody] = useState("");
  const availableSegments = segments.length > 0 ? segments : DEFAULT_SEGMENTS;

  const selectedItem = useMemo(
    () => logs.find((item) => item.id === selectedItemId) ?? null,
    [logs, selectedItemId],
  );

  const stats = useMemo(() => {
    const inboundCount = logs.filter((log) => log.direction === "inbound").length;
    const outboundCount = logs.filter((log) => log.direction === "outbound").length;
    const newCount = logs.filter((log) => log.status === "new").length;
    return [
      { label: "Loaded items", value: String(logs.length), hint: pageInfo?.hasNextPage ? "More available" : "Current result set" },
      { label: "Inbound", value: String(inboundCount), hint: `${newCount} new in the loaded set` },
      { label: "Outbound", value: String(outboundCount), hint: "Campaign and delivery history" },
    ];
  }, [logs, pageInfo?.hasNextPage]);

  async function loadPreferences() {
    const response = await fetch("/api/admin/notification-preferences");
    if (response.status === 403) {
      setPreferences(null);
      return;
    }
    if (response.status === 401) {
      router.push("/login?next=/admin/messages");
      return;
    }

    const payload = (await response.json().catch(() => ({}))) as {
      preferences?: NotificationPreference[];
    };
    if (!response.ok) {
      return;
    }
    setPreferences(payload.preferences ?? []);
  }

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
    if (directionFilter) params.set("direction", directionFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    if (focusedInboundId) params.set("id", focusedInboundId);
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
      setError(payload.error || "Unable to load unified messages");
      setLoading(false);
      return;
    }

    const items = payload.items ?? [];
    setLogs((prev) => (options?.reset ? items : [...prev, ...items]));
    setSegments(payload.segments ?? []);
    setPageInfo(payload.pageInfo ?? null);
    setLoading(false);
    if (focusedInboundId) {
      setFocusedInboundId("");
    }
    if (items.length > 0 && !selectedItemId) {
      setSelectedItemId(items[0]!.id);
    }
  }

  useEffect(() => {
    loadLogs({ reset: true }).catch(() => {
      setError("Unable to load unified messages");
      setLoading(false);
    });
    loadPreferences().catch(() => undefined);
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
    const feedback = buildSendFeedback({
      label: "Campaign",
      successCount: payload.successCount ?? 0,
      failedCount: payload.failedCount ?? 0,
      skippedCount: payload.skippedCount ?? 0,
    });
    await loadLogs({ reset: true });
    if (feedback.status === "failure") {
      setError(feedback.message);
      return;
    }
    setNotice(feedback.message);
  }

  async function resetFilters() {
    setQ("");
    setStatusFilter("");
    setSourceFilter("");
    setDirectionFilter("");
    setCategoryFilter("");
    setFocusedInboundId("");
    setSelectedItemId("");
    await loadLogs({ reset: true });
  }

  async function updateInboundStatus(status: "new" | "read" | "archived") {
    if (!selectedItem || selectedItem.direction !== "inbound") {
      return;
    }

    setSavingStatus(true);
    setError("");
    const eventId = selectedItem.id.replace("inbound:", "");
    const response = await fetch(`/api/admin/messages/inbound/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setSavingStatus(false);

    if (!response.ok) {
      setError(payload.error || "Unable to update inbox item");
      return;
    }

    setLogs((current) =>
      current.map((item) => (item.id === selectedItem.id ? { ...item, status } : item)),
    );
    setNotice(`Inbox item marked ${status}.`);
  }

  async function togglePreference(category: string, enabled: boolean) {
    const response = await fetch("/api/admin/notification-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, enabled }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error || "Unable to update notification preference");
      return;
    }

    setPreferences((current) =>
      current?.map((item) => (item.category === category ? { ...item, enabled } : item)) ?? null,
    );
  }

  return (
    <AdminShell
      currentPath="/admin/messages"
      title="Unified Messages"
      description="Review inbound submissions, manage admin alerts, and send quick outbound campaigns from one admin hub."
      stats={stats}
      actions={<Link href="/admin/templates" className={adminStyles.actionPill}>Open templates</Link>}
    >
      {preferences ? (
        <section className={styles.preferences}>
          <div>
            <h2>Super Admin Alerts</h2>
            <p>Choose which inbound categories should send you SendGrid email alerts.</p>
          </div>
          <div className={styles.preferenceGrid}>
            {preferences.map((preference) => (
              <label key={preference.category} className={styles.preferenceItem}>
                <span>{preference.label}</span>
                <input
                  type="checkbox"
                  checked={preference.enabled}
                  onChange={(event) => void togglePreference(preference.category, event.target.checked)}
                />
              </label>
            ))}
          </div>
        </section>
      ) : null}

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
          <button type="button" onClick={() => void runCampaign("preview")} disabled={working}>
            Preview recipients
          </button>
          <button type="button" onClick={() => void runCampaign("send")} disabled={working}>
            Send campaign
          </button>
        </div>
      </section>

      <section className={adminStyles.toolbar}>
        <div className={adminStyles.toolbarHeader}>
          <p className={adminStyles.toolbarTitle}>Inbox filters</p>
          <p className={adminStyles.toolbarMeta}>Filter inbound submissions and outbound deliveries from one table.</p>
        </div>
        <div className={adminStyles.toolbarFields}>
          <label>
            Search
            <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Name, email, subject" />
          </label>
          <label>
            Direction
            <select value={directionFilter} onChange={(event) => setDirectionFilter(event.target.value as typeof directionFilter)}>
              <option value="">All</option>
              <option value="inbound">inbound</option>
              <option value="outbound">outbound</option>
            </select>
          </label>
          <label>
            Source
            <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
              <option value="">All</option>
              <option value="form_submission">form_submission</option>
              <option value="mailchimp_signup">mailchimp_signup</option>
              <option value="manual">manual</option>
              <option value="newsletter">newsletter</option>
              <option value="automated">automated</option>
              <option value="dues">dues</option>
            </select>
          </label>
          <label>
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All</option>
              <option value="new">new</option>
              <option value="read">read</option>
              <option value="archived">archived</option>
              <option value="sent">sent</option>
              <option value="failed">failed</option>
              <option value="skipped">skipped</option>
            </select>
          </label>
          <label>
            Category
            <input value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} placeholder="general_forms, kosher..." />
          </label>
        </div>
        <div className={adminStyles.toolbarActions}>
          <button type="button" className={adminStyles.primaryButton} onClick={() => void loadLogs({ reset: true })}>
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
        <p>Loading unified messages...</p>
      ) : (
        <>
          <section className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Direction</th>
                  <th>Source</th>
                  <th>Person</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Category</th>
                  <th>Actor</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className={log.id === selectedItemId ? styles.selectedRow : undefined}
                    onClick={() => setSelectedItemId(log.id)}
                  >
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>{log.direction}</td>
                    <td>{log.source}</td>
                    <td>
                      {log.recipientName || "-"}
                      <br />
                      {log.recipientEmail || "-"}
                    </td>
                    <td>{log.subject}</td>
                    <td>{log.status}</td>
                    <td>{log.campaignName}</td>
                    <td>{log.actorEmail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {selectedItem ? (
            <section className={styles.detailCard}>
              <div className={styles.detailHeader}>
                <div>
                  <h2>{selectedItem.subject}</h2>
                  <p>{selectedItem.summary || "No summary available."}</p>
                </div>
                {selectedItem.direction === "inbound" ? (
                  <div className={styles.detailActions}>
                    <button type="button" disabled={savingStatus} onClick={() => void updateInboundStatus("new")}>
                      Mark new
                    </button>
                    <button type="button" disabled={savingStatus} onClick={() => void updateInboundStatus("read")}>
                      Mark read
                    </button>
                    <button type="button" disabled={savingStatus} onClick={() => void updateInboundStatus("archived")}>
                      Archive
                    </button>
                  </div>
                ) : null}
              </div>
              <div className={styles.detailGrid}>
                <div>
                  <strong>Source</strong>
                  <p>{selectedItem.source}</p>
                </div>
                <div>
                  <strong>Status</strong>
                  <p>{selectedItem.status}</p>
                </div>
                <div>
                  <strong>Person</strong>
                  <p>
                    {selectedItem.recipientName || "-"}
                    <br />
                    {selectedItem.recipientEmail || "-"}
                  </p>
                </div>
                <div>
                  <strong>Record</strong>
                  <p>
                    <Link href={selectedItem.sourceRecordHref}>{selectedItem.sourceRecordLabel}</Link>
                  </p>
                </div>
                <div>
                  <strong>Provider</strong>
                  <p>{selectedItem.provider}</p>
                </div>
                <div>
                  <strong>Provider message id</strong>
                  <p>{selectedItem.providerMessageId || "-"}</p>
                </div>
              </div>
              {selectedItem.errorMessage ? (
                <div className={styles.detailError}>
                  <strong>Error</strong>
                  <p>{selectedItem.errorMessage}</p>
                </div>
              ) : null}
              <div className={styles.payloadBlock}>
                <strong>Payload</strong>
                <pre>{JSON.stringify(selectedItem.payloadJson, null, 2)}</pre>
              </div>
            </section>
          ) : null}

          {pageInfo?.hasNextPage && pageInfo.nextCursor ? (
            <div className={styles.loadMoreWrap}>
              <button type="button" onClick={() => void loadLogs({ cursor: pageInfo.nextCursor })}>
                Load more
              </button>
            </div>
          ) : null}
        </>
      )}
    </AdminShell>
  );
}
