"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart, type UIMessage } from "ai";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import adminStyles from "@/components/admin/admin-shell.module.css";
import { buildCampaignResultNotice } from "@/lib/admin/send-feedback";
import type { newsletterTemplates } from "@/db/schema";
import {
  bumpSaveGeneration,
  shouldResaveAfterPersist,
  shouldRunScheduledAutosave,
} from "@/lib/newsletter/studio-autosave";
import { extractLatestBodyHtmlFromMessages } from "@/lib/newsletter/studio-live-html";
import styles from "./page.module.css";

type TemplateRow = typeof newsletterTemplates.$inferSelect;

type StudioClientProps = {
  template: TemplateRow;
};

type SubscriberOption = {
  personId: number;
  displayName: string;
  email: string;
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
  const [html, setHtml] = useState(template.bodyHtml);
  const [subject, setSubject] = useState(template.subject || template.title);
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [liveTick, setLiveTick] = useState(0);

  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientMenuOpen, setRecipientMenuOpen] = useState(false);
  const [recipientOptions, setRecipientOptions] = useState<SubscriberOption[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<SubscriberOption[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  const htmlRef = useRef(html);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveGenerationRef = useRef(0);
  const persistDepthRef = useRef(0);

  useEffect(() => {
    htmlRef.current = html;
  }, [html]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/admin/templates/chat?templateId=${template.id}`,
        body: { templateId: template.id },
      }),
    [template.id],
  );

  const { messages, sendMessage, status, error: chatError, stop } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";

  function invalidatePendingAutosave() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    saveGenerationRef.current = bumpSaveGeneration(saveGenerationRef.current);
  }

  function applyLiveHtml(nextHtml: string, noticeText: string) {
    if (!nextHtml || nextHtml === htmlRef.current) return;
    invalidatePendingAutosave();
    htmlRef.current = nextHtml;
    setHtml(nextHtml);
    setLiveTick((value) => value + 1);
    setNotice(noticeText);
  }

  useEffect(() => {
    const nextHtml = extractLatestBodyHtmlFromMessages(messages);
    if (!nextHtml) return;
    applyLiveHtml(nextHtml, "Preview updated live from the chat agent.");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync from streaming tool parts
  }, [messages]);

  useEffect(() => {
    if (status !== "ready") return;
    void (async () => {
      const response = await fetch(`/api/admin/templates?id=${template.id}`);
      const payload = (await response.json().catch(() => ({}))) as { template?: TemplateRow };
      if (!response.ok || !payload.template) return;
      if (payload.template.bodyHtml) {
        applyLiveHtml(payload.template.bodyHtml, "Preview refreshed from the saved template.");
      }
      if (payload.template.subject) setSubject(payload.template.subject);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh after chat turns
  }, [status, messages.length, template.id]);

  useEffect(() => {
    if (!recipientMenuOpen) return;
    const handle = setTimeout(() => {
      void loadRecipients(recipientQuery);
    }, 180);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional search debounce
  }, [recipientQuery, recipientMenuOpen]);

  async function loadRecipients(query: string) {
    setLoadingRecipients(true);
    try {
      const params = new URLSearchParams({
        status: "subscribed",
        topic: "weekly",
      });
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(`/api/admin/newsletters/subscribers?${params.toString()}`);
      const payload = (await response.json().catch(() => ({}))) as {
        subscribers?: Array<{ personId: number; displayName: string; email: string }>;
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error || "Unable to load recipients.");
        setRecipientOptions([]);
        return;
      }
      const selectedIds = new Set(selectedRecipients.map((item) => item.personId));
      setRecipientOptions(
        (payload.subscribers ?? [])
          .filter((row) => row.email && !selectedIds.has(row.personId))
          .slice(0, 40)
          .map((row) => ({
            personId: row.personId,
            displayName: row.displayName || row.email,
            email: row.email,
          })),
      );
    } finally {
      setLoadingRecipients(false);
    }
  }

  async function persistHtml(nextHtml = htmlRef.current): Promise<boolean> {
    const attemptedHtml = nextHtml;
    persistDepthRef.current += 1;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: template.id,
          title: template.title,
          subject,
          parshaName: template.parshaName,
          shabbatDate: template.shabbatDate,
          hebrewDate: template.hebrewDate,
          candleLighting: template.candleLighting,
          slug: template.slug,
          category: template.category,
          previewText: template.previewText,
          bodyHtml: attemptedHtml,
          publishOnSend: template.publishOnSend,
          status: template.status,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(payload.error || "Unable to save HTML.");
        return false;
      }
      if (shouldResaveAfterPersist({ attemptedHtml, currentHtml: htmlRef.current })) {
        return persistHtml(htmlRef.current);
      }
      return true;
    } finally {
      persistDepthRef.current -= 1;
      if (persistDepthRef.current <= 0) {
        persistDepthRef.current = 0;
        setSaving(false);
      }
    }
  }

  function scheduleAutosave(nextHtml: string) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const scheduledGeneration = bumpSaveGeneration(saveGenerationRef.current);
    saveGenerationRef.current = scheduledGeneration;
    saveTimerRef.current = setTimeout(() => {
      if (
        !shouldRunScheduledAutosave({
          scheduledGeneration,
          currentGeneration: saveGenerationRef.current,
          scheduledHtml: nextHtml,
          currentHtml: htmlRef.current,
        })
      ) {
        return;
      }
      void persistHtml(nextHtml);
    }, 900);
  }

  function onHtmlChange(value: string) {
    htmlRef.current = value;
    setHtml(value);
    scheduleAutosave(value);
  }

  async function openChat() {
    setError("");
    setNotice("");
    const saved = await persistHtml(htmlRef.current);
    if (!saved) return;
    setChatOpen(true);
    setTimeout(() => chatInputRef.current?.focus(), 80);
  }

  async function onSendChat(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setError("");
    setDraft("");
    await persistHtml(htmlRef.current);
    await sendMessage({ text });
  }

  function addRecipient(option: SubscriberOption) {
    setSelectedRecipients((prev) => {
      if (prev.some((item) => item.personId === option.personId)) return prev;
      return [...prev, option];
    });
    setRecipientQuery("");
    setRecipientMenuOpen(false);
  }

  function removeRecipient(personId: number) {
    setSelectedRecipients((prev) => prev.filter((item) => item.personId !== personId));
  }

  async function runCampaign(mode: "preview" | "send") {
    if (selectedRecipients.length === 0) {
      setError("Select at least one recipient from the searchable list.");
      return;
    }
    setSending(true);
    setError("");
    setNotice("");
    try {
      const saved = await persistHtml(htmlRef.current);
      if (!saved) return;
      const response = await fetch("/api/admin/templates/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
          recipientGroup: "selected",
          personIds: selectedRecipients.map((item) => item.personId),
          mode,
          subjectOverride: subject || undefined,
          bodyHtmlOverride: htmlRef.current,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        status?: string;
        mode?: string;
        successCount?: number;
        failedCount?: number;
        skippedCount?: number;
        recipientCount?: number;
        campaignId?: number;
        rejectedPersonIds?: number[];
      };
      if (!response.ok) {
        const rejected =
          payload.rejectedPersonIds && payload.rejectedPersonIds.length > 0
            ? ` Rejected IDs: ${payload.rejectedPersonIds.join(", ")}.`
            : "";
        setError((payload.error || "Send failed.") + rejected);
        return;
      }
      const feedback = buildCampaignResultNotice({
        label: "Campaign",
        mode: payload.mode ?? mode,
        status: payload.status,
        successCount: payload.successCount,
        failedCount: payload.failedCount,
        skippedCount: payload.skippedCount,
        recipientCount: payload.recipientCount,
        campaignId: payload.campaignId,
      });
      if (feedback.status === "failure") setError(feedback.message);
      else setNotice(feedback.message);
      if (mode === "send") setConfirmSendOpen(false);
    } finally {
      setSending(false);
    }
  }

  return (
    <AdminShell
      currentPath="/admin/templates"
      title="Newsletter Studio"
      description="Edit HTML on the left, watch a live browser preview on the right, chat the agent into changes, then send."
      breadcrumbs={[
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/templates", label: "Templates" },
        { label: template.title || "Studio" },
      ]}
      actions={
        <>
          <Link href={`/admin/templates/${template.id}/edit`} className={adminStyles.actionPill}>
            Classic editor
          </Link>
          <Link href="/admin/templates" className={adminStyles.actionPill}>
            All newsletters
          </Link>
        </>
      }
    >
      <div className={styles.studio}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarMeta}>
            <p className={styles.toolbarEyebrow}>Split studio</p>
            <h2 className={styles.toolbarTitle}>{template.title}</h2>
          </div>
          <div className={styles.toolbarActions}>
            {liveTick > 0 ? <span className={styles.livePulse}>Live preview synced</span> : null}
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={saving}
              onClick={() => void persistHtml()}
            >
              {saving ? "Saving…" : "Save HTML"}
            </button>
            <button type="button" className={styles.primaryButton} onClick={() => void openChat()}>
              Show it in Chat
            </button>
          </div>
        </div>

        {notice ? <p className={styles.notice}>{notice}</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}

        <div className={styles.split}>
          <section className={styles.panel} aria-label="HTML editor">
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>HTML</h3>
              <p className={styles.panelHint}>Autosaves as you type</p>
            </div>
            <textarea
              className={styles.htmlEditor}
              value={html}
              onChange={(event) => onHtmlChange(event.target.value)}
              spellCheck={false}
              aria-label="Newsletter HTML source"
            />
          </section>

          <section className={styles.panel} aria-label="Live preview">
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Preview</h3>
              <p className={styles.panelHint}>Fully rendered in-browser</p>
            </div>
            <iframe
              title="Newsletter live preview"
              className={styles.previewFrame}
              srcDoc={html}
              sandbox="allow-same-origin"
              referrerPolicy="no-referrer"
            />
          </section>
        </div>

        <section className={styles.sendBar} aria-label="Send newsletter">
          <div className={styles.sendFields}>
            <label className={styles.fieldLabel}>
              Subject
              <input
                className={styles.subjectInput}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </label>

            <div className={styles.fieldLabel}>
              Recipients
              <div className={styles.recipientShell}>
                <div className={styles.recipientSearchRow}>
                  <input
                    value={recipientQuery}
                    onChange={(event) => {
                      setRecipientQuery(event.target.value);
                      setRecipientMenuOpen(true);
                    }}
                    onFocus={() => {
                      setRecipientMenuOpen(true);
                      void loadRecipients(recipientQuery);
                    }}
                    placeholder="Search subscribers by name or email"
                    aria-label="Search recipients"
                  />
                  <button
                    type="button"
                    className={styles.ghostButton}
                    onClick={() => {
                      setRecipientMenuOpen((open) => !open);
                      if (!recipientMenuOpen) void loadRecipients(recipientQuery);
                    }}
                  >
                    {loadingRecipients ? "…" : "Browse"}
                  </button>
                </div>
                {recipientMenuOpen ? (
                  <div className={styles.recipientMenu} role="listbox" aria-label="Recipient matches">
                    {recipientOptions.length === 0 ? (
                      <button type="button" className={styles.recipientOption} disabled>
                        <span>{loadingRecipients ? "Searching…" : "No matching subscribed recipients"}</span>
                      </button>
                    ) : (
                      recipientOptions.map((option) => (
                        <button
                          key={option.personId}
                          type="button"
                          className={styles.recipientOption}
                          onClick={() => addRecipient(option)}
                        >
                          <span>
                            <strong>{option.displayName}</strong>
                            <span>{option.email}</span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            {selectedRecipients.length > 0 ? (
              <div className={styles.chipRow}>
                {selectedRecipients.map((recipient) => (
                  <span key={recipient.personId} className={styles.chip}>
                    {recipient.displayName}
                    <button
                      type="button"
                      aria-label={`Remove ${recipient.displayName}`}
                      onClick={() => removeRecipient(recipient.personId)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className={styles.statusText}>
                Choose one or more confirmed weekly subscribers, preview the audience, then send via SendGrid.
              </p>
            )}
          </div>

          <div className={styles.sendActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={sending || selectedRecipients.length === 0}
              onClick={() => void runCampaign("preview")}
            >
              {sending ? "Working…" : "Preview recipients"}
            </button>
            <button
              type="button"
              className={styles.dangerButton}
              disabled={sending || selectedRecipients.length === 0}
              onClick={() => {
                setError("");
                setConfirmSendOpen(true);
              }}
            >
              {`Send to ${selectedRecipients.length || "…"}`}
            </button>
            <p className={styles.statusText}>
              Uses the current HTML snapshot through the existing SendGrid campaign pipeline.
            </p>
          </div>
        </section>
      </div>

      {confirmSendOpen ? (
        <div className={styles.confirmDrawer} role="dialog" aria-modal="true" aria-labelledby="studio-send-confirm-title">
          <button
            type="button"
            className={styles.chatScrim}
            aria-label="Cancel send"
            onClick={() => setConfirmSendOpen(false)}
          />
          <div className={styles.confirmPanel}>
            <h3 id="studio-send-confirm-title" className={styles.panelTitle}>
              Send newsletter?
            </h3>
            <p className={styles.panelHint}>
              Subject: <strong>{subject || "(missing subject)"}</strong>
            </p>
            <p className={styles.statusText}>
              This emails {selectedRecipients.length} confirmed weekly subscriber
              {selectedRecipients.length === 1 ? "" : "s"} via SendGrid:
            </p>
            <ul className={styles.confirmList}>
              {selectedRecipients.slice(0, 12).map((recipient) => (
                <li key={recipient.personId}>
                  {recipient.displayName} &lt;{recipient.email}&gt;
                </li>
              ))}
              {selectedRecipients.length > 12 ? (
                <li>…and {selectedRecipients.length - 12} more</li>
              ) : null}
            </ul>
            <div className={styles.toolbarActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={sending}
                onClick={() => setConfirmSendOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                disabled={sending}
                onClick={() => void runCampaign("send")}
              >
                {sending ? "Sending…" : "Confirm send"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {chatOpen ? (
        <div className={styles.chatDrawer} role="dialog" aria-modal="true" aria-label="Newsletter chat">
          <button type="button" className={styles.chatScrim} aria-label="Close chat" onClick={() => setChatOpen(false)} />
          <aside className={styles.chatPanel}>
            <div className={styles.chatHeader}>
              <div>
                <h3 className={styles.panelTitle}>Show it in Chat</h3>
                <p className={styles.panelHint}>Ask for edits — the HTML and preview update live.</p>
              </div>
              <button type="button" className={styles.ghostButton} onClick={() => setChatOpen(false)}>
                Close
              </button>
            </div>
            <div className={styles.chatBody}>
              {messages.length === 0 ? (
                <p className={styles.emptyChat}>
                  Try “Make the intro warmer” or “Add candle lighting at 7:12pm.” The agent writes HTML directly into the
                  editor.
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
                      {tools.length > 0 ? <div className={styles.toolNote}>Tools: {tools.join(" · ")}</div> : null}
                    </div>
                  );
                })
              )}
            </div>
            <form className={styles.chatComposer} onSubmit={onSendChat}>
              <textarea
                ref={chatInputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Describe the change you want in the newsletter…"
                disabled={busy}
              />
              <div className={styles.composerRow}>
                <span className={styles.statusText}>
                  {chatError ? chatError.message : busy ? "Agent working…" : "Ready"}
                </span>
                <div className={styles.toolbarActions}>
                  {busy ? (
                    <button type="button" className={styles.secondaryButton} onClick={() => stop()}>
                      Stop
                    </button>
                  ) : null}
                  <button type="submit" className={styles.primaryButton} disabled={busy || !draft.trim()}>
                    Apply in chat
                  </button>
                </div>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </AdminShell>
  );
}
