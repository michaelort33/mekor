"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";

import styles from "./newsletter-campaign-history.module.css";

export type NewsletterCampaignSummary = {
  id: number;
  recipientGroup: string;
  subject: string;
  recipientCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  status: string;
  scheduledAt: string | null;
  startedAt: string;
  completedAt: string | null;
  sentByDisplayName: string;
  sentByEmail: string;
};

export type NewsletterDeliveryRow = {
  id: number;
  recipientEmail: string;
  recipientName: string;
  status: "queued" | "processing" | "sent" | "failed" | "skipped" | string;
  errorMessage: string;
  sentAt: string | null;
};

export type NewsletterCampaignHistoryHandle = {
  reload: () => Promise<void>;
};

type NewsletterCampaignHistoryProps = {
  templateId: number;
  highlightCampaignId?: number | null;
  autoExpandLatest?: boolean;
  allowCancelScheduled?: boolean;
  className?: string;
  title?: string;
};

function formatWhen(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (status === "sent" || status === "completed") return styles.statusGood;
  if (status === "failed") return styles.statusBad;
  if (status === "partial" || status === "skipped") return styles.statusWarn;
  return styles.statusNeutral;
}

export const NewsletterCampaignHistory = forwardRef<
  NewsletterCampaignHistoryHandle,
  NewsletterCampaignHistoryProps
>(function NewsletterCampaignHistory(
  {
    templateId,
    highlightCampaignId = null,
    autoExpandLatest = true,
    allowCancelScheduled = false,
    className,
    title = "Send results & history",
  },
  ref,
) {
  const [campaigns, setCampaigns] = useState<NewsletterCampaignSummary[]>([]);
  const [deliveriesByCampaign, setDeliveriesByCampaign] = useState<
    Record<string, NewsletterDeliveryRow[]>
  >({});
  const [eventCountsByCampaign, setEventCountsByCampaign] = useState<
    Record<string, Record<string, number>>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/templates/campaigns?templateId=${templateId}&limit=12`,
        { credentials: "same-origin" },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        campaigns?: NewsletterCampaignSummary[];
        deliveriesByCampaign?: Record<string, NewsletterDeliveryRow[]>;
        eventCountsByCampaign?: Record<string, Record<string, number>>;
      };
      if (!response.ok) {
        setError(payload.error || "Unable to load send history.");
        setCampaigns([]);
        setDeliveriesByCampaign({});
        setEventCountsByCampaign({});
        return;
      }
      const nextCampaigns = payload.campaigns ?? [];
      setCampaigns(nextCampaigns);
      setDeliveriesByCampaign(payload.deliveriesByCampaign ?? {});
      setEventCountsByCampaign(payload.eventCountsByCampaign ?? {});

      const nextExpanded = new Set<number>();
      if (highlightCampaignId) nextExpanded.add(highlightCampaignId);
      else if (autoExpandLatest && nextCampaigns[0]) nextExpanded.add(nextCampaigns[0].id);
      setExpandedIds(nextExpanded);
    } catch {
      setError("Unable to load send history.");
    } finally {
      setLoading(false);
    }
  }, [autoExpandLatest, highlightCampaignId, templateId]);

  useImperativeHandle(ref, () => ({ reload: loadCampaigns }), [loadCampaigns]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    if (!highlightCampaignId) return;
    setExpandedIds((previous) => {
      const next = new Set(previous);
      next.add(highlightCampaignId);
      return next;
    });
  }, [highlightCampaignId]);

  function toggleExpanded(campaignId: number) {
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(campaignId)) next.delete(campaignId);
      else next.add(campaignId);
      return next;
    });
  }

  async function cancelScheduled(campaignId: number) {
    if (!window.confirm("Cancel this scheduled newsletter?")) return;
    setCancellingId(campaignId);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/newsletters/campaigns/${campaignId}/cancel`, {
        method: "POST",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(payload.error || "Unable to cancel campaign.");
        return;
      }
      setNotice("Scheduled campaign cancelled.");
      await loadCampaigns();
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <section
      className={[styles.panel, className].filter(Boolean).join(" ")}
      aria-label={title}
      id="newsletter-send-results"
    >
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.hint}>
            Expand a send to see exactly who received it and whether delivery succeeded.
          </p>
        </div>
        <button type="button" className={styles.refreshButton} onClick={() => void loadCampaigns()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {notice ? <p className={styles.notice}>{notice}</p> : null}
      {loading && campaigns.length === 0 ? <p className={styles.muted}>Loading send history…</p> : null}
      {!loading && !error && campaigns.length === 0 ? (
        <p className={styles.muted}>No sends yet for this newsletter. Choose recipients above and send a test.</p>
      ) : null}

      {campaigns.length > 0 ? (
        <div className={styles.campaignList}>
          {campaigns.map((campaign) => {
            const open = expandedIds.has(campaign.id);
            const deliveries = deliveriesByCampaign[String(campaign.id)] ?? [];
            const events = eventCountsByCampaign[String(campaign.id)];
            const highlighted = highlightCampaignId === campaign.id;
            return (
              <article
                key={campaign.id}
                className={highlighted ? `${styles.campaignCard} ${styles.campaignHighlight}` : styles.campaignCard}
              >
                <button
                  type="button"
                  className={styles.campaignSummary}
                  aria-expanded={open}
                  onClick={() => toggleExpanded(campaign.id)}
                >
                  <span className={styles.summaryMain}>
                    <span className={`${styles.statusPill} ${statusClass(campaign.status)}`}>
                      {campaign.status}
                    </span>
                    <strong>
                      {campaign.successCount}/{campaign.recipientCount} sent
                      {campaign.failedCount ? ` · ${campaign.failedCount} failed` : ""}
                      {campaign.skippedCount ? ` · ${campaign.skippedCount} skipped` : ""}
                    </strong>
                    <span className={styles.subject}>{campaign.subject || "Newsletter send"}</span>
                  </span>
                  <span className={styles.summaryMeta}>
                    <span>
                      {campaign.scheduledAt ? "Scheduled" : "Started"}{" "}
                      {formatWhen(campaign.scheduledAt || campaign.startedAt)}
                    </span>
                    <span>
                      By {campaign.sentByDisplayName} ({campaign.sentByEmail})
                    </span>
                    <span className={styles.expandCue}>{open ? "Hide recipients" : "Show recipients"}</span>
                  </span>
                </button>

                {open ? (
                  <div className={styles.campaignBody}>
                    {events ? (
                      <p className={styles.events}>
                        Provider events:{" "}
                        {Object.entries(events)
                          .map(([event, count]) => `${event} ${count}`)
                          .join(" · ")}
                      </p>
                    ) : null}
                    {allowCancelScheduled && campaign.status === "scheduled" ? (
                      <button
                        type="button"
                        className={styles.cancelButton}
                        disabled={cancellingId === campaign.id}
                        onClick={() => void cancelScheduled(campaign.id)}
                      >
                        {cancellingId === campaign.id ? "Cancelling…" : "Cancel scheduled send"}
                      </button>
                    ) : null}
                    {deliveries.length === 0 ? (
                      <p className={styles.muted}>No delivery rows available for this send yet.</p>
                    ) : (
                      <div className={styles.tableWrap}>
                        <table className={styles.table}>
                          <thead>
                            <tr>
                              <th scope="col">Recipient</th>
                              <th scope="col">Email</th>
                              <th scope="col">Status</th>
                              <th scope="col">Error</th>
                              <th scope="col">Sent at</th>
                            </tr>
                          </thead>
                          <tbody>
                            {deliveries.map((delivery) => (
                              <tr key={delivery.id}>
                                <td>{delivery.recipientName || "—"}</td>
                                <td>{delivery.recipientEmail || "—"}</td>
                                <td>
                                  <span className={`${styles.statusPill} ${statusClass(delivery.status)}`}>
                                    {delivery.status}
                                  </span>
                                </td>
                                <td className={styles.errorCell}>{delivery.errorMessage || "—"}</td>
                                <td>{formatWhen(delivery.sentAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
});
