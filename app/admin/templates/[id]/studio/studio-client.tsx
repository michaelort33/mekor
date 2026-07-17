"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart, type UIMessage } from "ai";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import adminStyles from "@/components/admin/admin-shell.module.css";
import { buildSendFeedback } from "@/lib/admin/send-feedback";
import type { newsletterTemplates } from "@/db/schema";
import styles from "./page.module.css";

type TemplateRow = typeof newsletterTemplates.$inferSelect;
type WorkspaceTab = "preview" | "source" | "details";
type RecipientGroup = "newsletter_subscribers" | "admins_only";

type StudioClientProps = {
  template: TemplateRow;
};

function messageText(message: UIMessage) {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function toolSummaries(message: UIMessage) {
  return message.parts.filter(isToolUIPart).map((part) => {
    const state = "state" in part ? String(part.state) : "unknown";
    return `${getToolName(part)} (${state})`;
  });
}

export function NewsletterStudioClient({ template }: StudioClientProps) {
  const [tab, setTab] = useState<WorkspaceTab>("preview");
  const [draft, setDraft] = useState("");
  const [html, setHtml] = useState(template.bodyHtml);
  const [meta, setMeta] = useState({
    title: template.title,
    subject: template.subject,
    parshaName: template.parshaName,
    shabbatDate: template.shabbatDate,
    hebrewDate: template.hebrewDate,
    candleLighting: template.candleLighting,
    previewText: template.previewText,
    status: template.status,
    publishOnSend: template.publishOnSend,
  });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [savingSource, setSavingSource] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [sendGroup, setSendGroup] = useState<RecipientGroup>("newsletter_subscribers");
  const [subjectOverride, setSubjectOverride] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [sending, setSending] = useState(false);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/admin/templates/chat?templateId=${template.id}`,
        body: { templateId: template.id },
      }),
    [template.id],
  );

  const { messages, sendMessage, status, error: chatError, stop } = useChat({ transport });

  async function refreshTemplate() {
    const response = await fetch(`/api/admin/templates?id=${template.id}`);
    const payload = (await response.json().catch(() => ({}))) as {
      template?: TemplateRow;
      error?: string;
    };
    if (!response.ok || !payload.template) return;
    setHtml(payload.template.bodyHtml);
    setMeta({
      title: payload.template.title,
      subject: payload.template.subject,
      parshaName: payload.template.parshaName,
      shabbatDate: payload.template.shabbatDate,
      hebrewDate: payload.template.hebrewDate,
      candleLighting: payload.template.candleLighting,
      previewText: payload.template.previewText,
      status: payload.template.status,
      publishOnSend: payload.template.publishOnSend,
    });
  }

  useEffect(() => {
    if (status === "ready") {
      void refreshTemplate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh after chat turns
  }, [status, messages.length]);

  async function onSendChat(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || status === "submitted" || status === "streaming") return;
    setError("");
    setDraft("");
    await sendMessage({ text });
  }

  async function saveSource() {
    setSavingSource(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: template.id,
          ...meta,
          bodyHtml: html,
          slug: template.slug,
          category: template.category,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(payload.error || "Unable to save HTML.");
        return;
      }
      setNotice("Saved HTML to the database send snapshot.");
      await refreshTemplate();
    } finally {
      setSavingSource(false);
    }
  }

  async function saveMetadata() {
    setSavingMeta(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: template.id,
          ...meta,
          bodyHtml: html,
          slug: template.slug,
          category: template.category,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(payload.error || "Unable to save metadata.");
        return;
      }
      setNotice("Template details saved.");
      await refreshTemplate();
    } finally {
      setSavingMeta(false);
    }
  }

  async function runSend(mode: "preview" | "send" | "schedule") {
    setSending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/templates/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
          recipientGroup: sendGroup,
          mode,
          subjectOverride: subjectOverride || undefined,
          scheduledAt: mode === "schedule" && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        successCount?: number;
        failedCount?: number;
        skippedCount?: number;
        recipientCount?: number;
      };
      if (!response.ok) {
        setError(payload.error || "Send failed.");
        return;
      }
      if (mode === "preview") {
        setNotice(`Preview ready for ${payload.recipientCount ?? 0} recipient(s).`);
        return;
      }
      if (mode === "schedule") {
        setNotice(`Campaign scheduled for ${scheduledAt || "the selected time"}.`);
        return;
      }
      const feedback = buildSendFeedback({
        label: "Campaign",
        successCount: payload.successCount ?? 0,
        failedCount: payload.failedCount ?? 0,
        skippedCount: payload.skippedCount ?? 0,
      });
      if (feedback.status === "failure") {
        setError(feedback.message);
      } else {
        setNotice(feedback.message);
      }
    } finally {
      setSending(false);
    }
  }

  const busy = status === "submitted" || status === "streaming";

  return (
    <AdminShell
      currentPath="/admin/templates"
      title="Newsletter Chat Studio"
      description="Chat with an AI agent to edit newsletter HTML stored in the database, then send with the existing campaign pipeline."
      breadcrumbs={[
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/templates", label: "Templates" },
        { label: meta.title || "Studio" },
      ]}
      actions={
        <>
          <Link href={`/admin/templates/${template.id}/edit`} className={adminStyles.actionPill}>
            Classic editor
          </Link>
          <Link href={`/admin/templates/${template.id}/preview`} className={adminStyles.actionPill}>
            Preview page
          </Link>
        </>
      }
    >
      <div className={styles.layout}>
        <section className={styles.panel} aria-label="Chat">
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Chat</h2>
            <span className={styles.statusText}>{busy ? "Working…" : "Ready"}</span>
          </div>
          <div className={styles.chatBody}>
            {messages.length === 0 ? (
              <p className={styles.emptyChat}>
                Ask for a rewrite, a parsha update, or a layout tweak. The agent reads and writes the
                database HTML through tools.
              </p>
            ) : (
              messages.map((message) => {
                const text = messageText(message);
                const tools = toolSummaries(message);
                return (
                  <div
                    key={message.id}
                    className={`${styles.message} ${
                      message.role === "user" ? styles.messageUser : styles.messageAssistant
                    }`}
                  >
                    {text || (message.role === "assistant" ? "…" : "")}
                    {tools.length > 0 ? (
                      <div className={styles.toolNote}>Tools: {tools.join(" · ")}</div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
          <form className={styles.chatComposer} onSubmit={onSendChat}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="e.g. Soften the intro and add candle lighting for 7:12pm"
              disabled={busy}
            />
            <div className={styles.composerRow}>
              <span className={styles.statusText}>
                {chatError ? chatError.message : "Session-only chat · DB HTML source of truth"}
              </span>
              <div className={styles.sendActions}>
                {busy ? (
                  <button type="button" className={styles.secondaryButton} onClick={() => stop()}>
                    Stop
                  </button>
                ) : null}
                <button type="submit" className={styles.primaryButton} disabled={busy || !draft.trim()}>
                  Send
                </button>
              </div>
            </div>
          </form>
        </section>

        <section className={styles.panel} aria-label="Workspace">
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Workspace</h2>
            <div className={styles.tabs}>
              {(
                [
                  ["preview", "Preview"],
                  ["source", "Source"],
                  ["details", "Details"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={tab === key ? styles.tabActive : styles.tab}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.workspace}>
            {notice ? <p className={styles.notice}>{notice}</p> : null}
            {error ? <p className={styles.error}>{error}</p> : null}

            {tab === "preview" ? (
              <iframe title="Newsletter preview" className={styles.previewFrame} srcDoc={html} />
            ) : null}

            {tab === "source" ? (
              <>
                <textarea
                  className={styles.sourceEditor}
                  value={html}
                  onChange={(event) => setHtml(event.target.value)}
                  spellCheck={false}
                />
                <div className={styles.sendActions}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={savingSource}
                    onClick={() => void saveSource()}
                  >
                    Save HTML
                  </button>
                </div>
              </>
            ) : null}

            {tab === "details" ? (
              <>
                <div className={styles.metaGrid}>
                  {(
                    [
                      ["title", "Title"],
                      ["subject", "Subject"],
                      ["parshaName", "Parsha"],
                      ["shabbatDate", "Shabbat date"],
                      ["hebrewDate", "Hebrew date"],
                      ["candleLighting", "Candle lighting"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className={styles.field}>
                      <span>{label}</span>
                      <input
                        value={meta[key]}
                        onChange={(event) => setMeta((prev) => ({ ...prev, [key]: event.target.value }))}
                      />
                    </label>
                  ))}
                  <label className={styles.field}>
                    <span>Status</span>
                    <select
                      value={meta.status}
                      onChange={(event) =>
                        setMeta((prev) => ({
                          ...prev,
                          status: event.target.value as TemplateRow["status"],
                        }))
                      }
                    >
                      <option value="draft">draft</option>
                      <option value="ready">ready</option>
                      <option value="sent">sent</option>
                      <option value="archived">archived</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>Preview text</span>
                    <input
                      value={meta.previewText}
                      onChange={(event) => setMeta((prev) => ({ ...prev, previewText: event.target.value }))}
                    />
                  </label>
                </div>
                <div className={styles.sendActions}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={savingMeta}
                    onClick={() => void saveMetadata()}
                  >
                    Save details
                  </button>
                </div>

                <div className={styles.sendBox}>
                  <strong>Finalize & send</strong>
                  <p className={styles.statusText}>
                    Uses the database HTML snapshot via the existing campaign pipeline.
                  </p>
                  <label className={styles.field}>
                    <span>Recipient group</span>
                    <select
                      value={sendGroup}
                      onChange={(event) => setSendGroup(event.target.value as RecipientGroup)}
                    >
                      <option value="newsletter_subscribers">Confirmed newsletter subscribers</option>
                      <option value="admins_only">Admins only</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>Subject override (optional)</span>
                    <input value={subjectOverride} onChange={(event) => setSubjectOverride(event.target.value)} />
                  </label>
                  <label className={styles.field}>
                    <span>Schedule at (local)</span>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(event) => setScheduledAt(event.target.value)}
                    />
                  </label>
                  <div className={styles.sendActions}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      disabled={sending}
                      onClick={() => void runSend("preview")}
                    >
                      Preview recipients
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      disabled={sending || !scheduledAt}
                      onClick={() => void runSend("schedule")}
                    >
                      Schedule
                    </button>
                    <button
                      type="button"
                      className={styles.dangerButton}
                      disabled={sending}
                      onClick={() => void runSend("send")}
                    >
                      Send now
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
