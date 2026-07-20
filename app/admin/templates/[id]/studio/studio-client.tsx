"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart, type UIMessage } from "ai";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import adminStyles from "@/components/admin/admin-shell.module.css";
import {
  NewsletterCampaignHistory,
  type NewsletterCampaignHistoryHandle,
} from "@/components/admin/newsletter-campaign-history";
import { NewsletterFlowSteps } from "@/components/admin/newsletter-flow-steps";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
  Message,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { buildSendFeedback } from "@/lib/admin/send-feedback";
import type { newsletterTemplates } from "@/db/schema";
import { sanitizeNewsletterHtml } from "@/lib/newsletter/html-sanitize";
import {
  NEWSLETTER_RECIPIENT_LISTS,
  type NewsletterRecipientListKey,
} from "@/lib/newsletter/recipient-lists";
import { extractLatestBodyHtmlFromMessages } from "@/lib/newsletter/studio-live-html";
import styles from "./page.module.css";

type TemplateRow = typeof newsletterTemplates.$inferSelect;

type StudioClientProps = {
  template: TemplateRow;
  initialMessages: NewsletterStudioMessage[];
  fromNew?: boolean;
};

type SendPhase = "idle" | "saving" | "sending" | "done";

export type NewsletterStudioMessageMetadata = {
  persisted?: boolean;
  createdAt?: string;
  changes?: string[];
};

export type NewsletterStudioMessage = UIMessage<NewsletterStudioMessageMetadata>;

type SubscriberOption = {
  personId: number;
  displayName: string;
  email: string;
};

function messageText(message: NewsletterStudioMessage) {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

const TOOL_LABELS: Record<string, string> = {
  getTemplateHtml: "Read current newsletter",
  setTemplateHtml: "Rebuilt newsletter HTML",
  patchTemplateHtml: "Updated newsletter HTML",
  validateHtml: "Validated email HTML",
  updateTemplateMetadata: "Updated newsletter details",
};

function toolSummaries(message: NewsletterStudioMessage) {
  return [...new Set(message.parts.filter(isToolUIPart).map((part) => {
    const state = "state" in part ? String(part.state) : "unknown";
    const name = getToolName(part);
    const label = TOOL_LABELS[name] ?? name;
    return state === "output-available" ? label : `${label}…`;
  }))];
}

function historyTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

export function NewsletterStudioClient({ template, initialMessages, fromNew = false }: StudioClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [html, setHtml] = useState(template.bodyHtml);
  const [subject, setSubject] = useState(template.subject || template.title);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendPhase, setSendPhase] = useState<SendPhase>("idle");
  const [liveTick, setLiveTick] = useState(0);
  const [showFromNewBanner, setShowFromNewBanner] = useState(fromNew);
  const [highlightCampaignId, setHighlightCampaignId] = useState<number | null>(null);
  const [flowFocus, setFlowFocus] = useState<"review" | "send">(fromNew ? "send" : "review");

  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientMenuOpen, setRecipientMenuOpen] = useState(false);
  const [recipientOptions, setRecipientOptions] = useState<SubscriberOption[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<SubscriberOption[]>([]);
  const [recipientListKey, setRecipientListKey] = useState<NewsletterRecipientListKey | null>(
    fromNew ? "michael_test" : null,
  );
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  const htmlRef = useRef(html);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const historyRef = useRef<NewsletterCampaignHistoryHandle | null>(null);
  const sendSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    htmlRef.current = html;
  }, [html]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<NewsletterStudioMessage>({
        api: `/api/admin/templates/chat?templateId=${template.id}`,
        body: { templateId: template.id },
      }),
    [template.id],
  );

  const { messages, sendMessage, status, error: chatError, stop } = useChat<NewsletterStudioMessage>({
    id: `newsletter-studio-${template.id}`,
    messages: initialMessages,
    transport,
  });
  const busy = status === "submitted" || status === "streaming";
  const previewHtml = useMemo(() => sanitizeNewsletterHtml(html), [html]);
  const changeCount = messages.filter((message) => message.role === "user").length;

  useEffect(() => {
    const nextHtml = extractLatestBodyHtmlFromMessages(messages);
    if (!nextHtml || nextHtml === htmlRef.current) return;
    setHtml(nextHtml);
    setLiveTick((value) => value + 1);
    setNotice("Preview updated live from the chat agent.");
  }, [messages]);

  useEffect(() => {
    if (status !== "ready") return;
    void (async () => {
      const response = await fetch(`/api/admin/templates?id=${template.id}`);
      const payload = (await response.json().catch(() => ({}))) as { template?: TemplateRow };
      if (!response.ok || !payload.template) return;
      if (payload.template.bodyHtml && payload.template.bodyHtml !== htmlRef.current) {
        setHtml(payload.template.bodyHtml);
        setLiveTick((value) => value + 1);
      }
      if (payload.template.subject) setSubject(payload.template.subject);
    })();
  }, [status, messages.length, template.id]);

  useEffect(() => {
    if (!recipientMenuOpen) return;
    const handle = setTimeout(() => {
      void loadRecipients(recipientQuery);
    }, 180);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional search debounce
  }, [recipientQuery, recipientMenuOpen]);

  useEffect(() => {
    if (!fromNew) return;
    router.replace(pathname, { scroll: false });
  }, [fromNew, pathname, router]);

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

  async function saveHtmlSnapshot(nextHtml: string, nextSubject?: string) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: template.id,
          bodyHtml: nextHtml,
          ...(nextSubject === undefined ? {} : { subject: nextSubject }),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(payload.error || "Unable to save HTML.");
        return false;
      }
      return true;
    } catch {
      setError("Unable to save HTML.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function persistHtml(nextHtml = html, nextSubject?: string) {
    const queued = saveQueueRef.current.then(() => saveHtmlSnapshot(nextHtml, nextSubject));
    saveQueueRef.current = queued.then(
      () => undefined,
      () => undefined,
    );
    return queued;
  }

  function scheduleAutosave(nextHtml: string) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persistHtml(nextHtml);
    }, 900);
  }

  function onHtmlChange(value: string) {
    setHtml(value);
    scheduleAutosave(value);
  }

  async function onSendChat(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setError("");
    const saved = await persistHtml(html, subject);
    if (!saved) return;
    setDraft("");
    await sendMessage({ text });
  }

  function addRecipient(option: SubscriberOption) {
    setRecipientListKey(null);
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

  function selectRecipientList(key: NewsletterRecipientListKey) {
    setRecipientListKey(key);
    setSelectedRecipients([]);
    setRecipientQuery("");
    setRecipientMenuOpen(false);
  }

  const activeRecipientList = recipientListKey
    ? NEWSLETTER_RECIPIENT_LISTS.find((list) => list.key === recipientListKey)!
    : null;
  const recipientCount = activeRecipientList?.emails.length ?? selectedRecipients.length;

  function scrollToSend() {
    setFlowFocus("send");
    setShowFromNewBanner(false);
    sendSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function runSend() {
    if (!recipientListKey && selectedRecipients.length === 0) {
      setError("Select at least one recipient from the searchable list.");
      setFlowFocus("send");
      return;
    }
    if (recipientListKey !== "michael_test") {
      const confirmed = window.confirm(
        `Send this newsletter now to ${recipientCount || "the selected"} recipient(s)?`,
      );
      if (!confirmed) return;
    }

    setSending(true);
    setSendPhase("saving");
    setError("");
    setNotice("");
    setFlowFocus("send");
    try {
      const saved = await persistHtml(html, subject);
      if (!saved) {
        setSendPhase("idle");
        return;
      }
      setSendPhase("sending");
      const response = await fetch("/api/admin/templates/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
          recipientGroup: recipientListKey ? "recipient_list" : "selected",
          ...(recipientListKey
            ? { recipientListKey }
            : { personIds: selectedRecipients.map((item) => item.personId) }),
          mode: "send",
          subjectOverride: subject || undefined,
          bodyHtmlOverride: html,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        campaignId?: number;
        successCount?: number;
        failedCount?: number;
        skippedCount?: number;
      };
      if (!response.ok) {
        setError(payload.error || "Send failed.");
        setSendPhase("idle");
        return;
      }
      const feedback = buildSendFeedback({
        label: "Campaign",
        successCount: payload.successCount ?? 0,
        failedCount: payload.failedCount ?? 0,
        skippedCount: payload.skippedCount ?? 0,
      });
      if (feedback.status === "failure") setError(feedback.message);
      else setNotice(feedback.message);
      if (payload.campaignId) setHighlightCampaignId(payload.campaignId);
      setSendPhase("done");
      await historyRef.current?.reload();
      document.getElementById("newsletter-send-results")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } finally {
      setSending(false);
    }
  }

  let sendPhaseLabel: string | null = null;
  switch (sendPhase) {
    case "idle":
      sendPhaseLabel = null;
      break;
    case "saving":
      sendPhaseLabel = "Saving HTML snapshot…";
      break;
    case "sending":
      sendPhaseLabel = "Creating campaign and delivering via SendGrid…";
      break;
    case "done":
      sendPhaseLabel = "Send finished. Expand the delivery table below for recipient-level results.";
      break;
    default: {
      const _exhaustive: never = sendPhase;
      void _exhaustive;
      sendPhaseLabel = null;
    }
  }

  return (
    <AdminShell
      currentPath="/admin/templates"
      title="Newsletter Studio"
      description="Review the live preview, polish with AI, then choose recipients and send — with delivery results on this same page."
      breadcrumbs={[
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/templates", label: "Newsletters" },
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
        <NewsletterFlowSteps current={flowFocus} ariaLabel="Newsletter studio steps" />

        {showFromNewBanner ? (
          <div className={styles.fromNewBanner} role="status">
            <div>
              <strong>Draft saved — next step is send.</strong>
              <p>
                Review the preview, make any last AI tweaks, then choose recipients below. For a safe check, use the
                Michael test list first.
              </p>
            </div>
            <button type="button" className={styles.primaryButton} onClick={scrollToSend}>
              Go to send
            </button>
          </div>
        ) : null}

        <div className={styles.toolbar}>
          <div className={styles.toolbarMeta}>
            <p className={styles.toolbarEyebrow}>Step 3 · Review & polish</p>
            <h2 className={styles.toolbarTitle}>{template.title}</h2>
          </div>
          <div className={styles.toolbarActions}>
            {liveTick > 0 ? <span className={styles.livePulse}>Live preview synced</span> : null}
            <button type="button" className={styles.secondaryButton} disabled={saving} onClick={() => void persistHtml(html, subject)}>
              {saving ? "Saving…" : "Save HTML"}
            </button>
            <button type="button" className={styles.secondaryButton} onClick={scrollToSend}>
              Jump to send
            </button>
          </div>
        </div>

        {notice ? <p className={styles.notice}>{notice}</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}

        <details className={styles.htmlDetails}>
          <summary>
            <span className={styles.htmlDetailsTitle}>
              <strong>HTML source</strong>
              <span>Advanced editor · autosaves as you type</span>
            </span>
            <span className={styles.expandLabel}>Edit code</span>
            <span className={styles.collapseLabel}>Collapse code</span>
          </summary>
          <textarea
            className={styles.htmlEditor}
            value={html}
            onChange={(event) => onHtmlChange(event.target.value)}
            spellCheck={false}
            aria-label="Newsletter HTML source"
          />
        </details>

        <div className={styles.workflow}>
          <section className={styles.panel} aria-label="Live preview">
            <div className={styles.panelHeader}>
              <div>
                <h3 className={styles.panelTitle}>Rendered newsletter</h3>
                <p className={styles.panelHint}>Updates as AI edits the design</p>
              </div>
              {liveTick > 0 ? <span className={styles.livePulse}>Synced</span> : null}
            </div>
            <iframe title="Newsletter live preview" className={styles.previewFrame} sandbox="" srcDoc={previewHtml} />
          </section>

          <aside className={styles.chatPanel} aria-label="Newsletter AI editor">
            <div className={styles.chatHeader}>
              <div>
                <h3 className={styles.panelTitle}>Edit with AI</h3>
                <p className={styles.panelHint}>
                  {changeCount > 0
                    ? `${changeCount} ${changeCount === 1 ? "change" : "changes"} in this newsletter history`
                    : "Describe a change and watch it appear beside you."}
                </p>
              </div>
              <span className={styles.agentStatus}>{busy ? "Working" : "Ready"}</span>
            </div>
            <MessageScrollerProvider autoScroll>
              <MessageScroller className={styles.chatBody} aria-live="polite">
                <MessageScrollerViewport className={styles.chatViewport}>
                  <MessageScrollerContent className={styles.chatContent}>
                    {messages.length === 0 ? (
                      <div className={styles.emptyChat}>
                        <strong>What should change?</strong>
                        <span>Try “Make the intro warmer” or “Add candle lighting at 7:12pm.”</span>
                        <span>Your prompts and the AI summaries will be saved with this newsletter.</span>
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isUser = message.role === "user";
                        const text = messageText(message);
                        const tools = toolSummaries(message);
                        const metadata = message.metadata;
                        const notes = [...(metadata?.changes ?? []), ...tools]
                          .map((note) => TOOL_LABELS[note] ?? note)
                          .filter((note, index, list) => list.indexOf(note) === index);

                        return (
                          <MessageScrollerItem key={message.id} scrollAnchor={isUser}>
                            <Message align={isUser ? "end" : "start"}>
                              <MessageContent>
                                <MessageHeader className={styles.messageHeader}>
                                  {isUser ? "You" : "Mekor AI"}
                                </MessageHeader>
                                <Bubble
                                  align={isUser ? "end" : "start"}
                                  variant={isUser ? "default" : "secondary"}
                                  className={styles.messageBubble}
                                >
                                  <BubbleContent className={styles.messageText}>
                                    {text || (message.role === "assistant" ? "…" : "")}
                                  </BubbleContent>
                                </Bubble>
                                {notes.length > 0 || metadata?.createdAt ? (
                                  <MessageFooter className={styles.messageFooter}>
                                    {notes.length > 0 ? <span>{notes.join(" · ")}</span> : null}
                                    {metadata?.createdAt ? (
                                      <time dateTime={metadata.createdAt}>{historyTime(metadata.createdAt)}</time>
                                    ) : null}
                                  </MessageFooter>
                                ) : null}
                              </MessageContent>
                            </Message>
                          </MessageScrollerItem>
                        );
                      })
                    )}
                  </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton className={styles.scrollButton} />
              </MessageScroller>
            </MessageScrollerProvider>
            <form className={styles.chatComposer} onSubmit={onSendChat}>
              <textarea
                name="newsletterChange"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Describe the change you want…"
                aria-label="Describe a newsletter change"
                disabled={busy}
              />
              <div className={styles.composerRow}>
                <span className={styles.statusText}>{chatError ? chatError.message : "AI edits update the preview live."}</span>
                <div className={styles.toolbarActions}>
                  {busy ? (
                    <button type="button" className={styles.secondaryButton} onClick={() => stop()}>
                      Stop
                    </button>
                  ) : null}
                  <button type="submit" className={styles.primaryButton} disabled={busy || !draft.trim()}>
                    Apply change
                  </button>
                </div>
              </div>
            </form>
          </aside>
        </div>

        <section
          ref={sendSectionRef}
          id="newsletter-send"
          className={styles.sendSection}
          aria-label="Send newsletter"
          onFocusCapture={() => setFlowFocus("send")}
        >
          <div className={styles.sendSectionHeader}>
            <div>
              <p className={styles.toolbarEyebrow}>Step 4 · Choose recipients and send</p>
              <h3 className={styles.sendSectionTitle}>Send this newsletter</h3>
              <p className={styles.panelHint}>
                Start with the Michael test list to confirm delivery, then expand the results table to inspect the
                recipient-level result.
              </p>
            </div>
          </div>

          <div className={styles.sendBar}>
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
                <div className={styles.recipientLists} aria-label="Newsletter recipient lists">
                  {NEWSLETTER_RECIPIENT_LISTS.map((list) => (
                    <button
                      key={list.key}
                      type="button"
                      className={recipientListKey === list.key ? styles.recipientListActive : styles.recipientList}
                      aria-pressed={recipientListKey === list.key}
                      onClick={() => selectRecipientList(list.key)}
                    >
                      <strong>{list.name}</strong>
                      <span>{list.description}</span>
                    </button>
                  ))}
                </div>
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

              {activeRecipientList ? (
                <div className={styles.chipRow}>
                  <span className={styles.chip}>
                    {activeRecipientList.name} · {activeRecipientList.emails.length} recipient
                    <button type="button" aria-label={`Remove ${activeRecipientList.name}`} onClick={() => setRecipientListKey(null)}>
                      ×
                    </button>
                  </span>
                </div>
              ) : selectedRecipients.length > 0 ? (
                <div className={styles.chipRow}>
                  {selectedRecipients.map((recipient) => (
                    <span key={recipient.personId} className={styles.chip}>
                      {recipient.displayName}
                      <button type="button" aria-label={`Remove ${recipient.displayName}`} onClick={() => removeRecipient(recipient.personId)}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className={styles.statusText}>Choose one or more confirmed weekly subscribers, then send via SendGrid.</p>
              )}
            </div>

            <div className={styles.sendActions}>
              <button
                type="button"
                className={styles.dangerButton}
                disabled={sending || recipientCount === 0}
                onClick={() => void runSend()}
              >
                {sending ? "Sending…" : `Send to ${recipientCount || "…"}`}
              </button>
              <p className={styles.statusText}>
                {activeRecipientList
                  ? `Test list is restricted to ${activeRecipientList.emails.join(", ")}.`
                  : "Uses the current HTML snapshot through the existing SendGrid campaign pipeline."}
              </p>
            </div>
          </div>

          {sendPhaseLabel ? (
            <div
              className={sendPhase === "done" ? styles.sendProgressDone : styles.sendProgress}
              role="status"
              aria-live="polite"
            >
              {sending ? <span className={styles.sendSpinner} aria-hidden="true" /> : null}
              <span>{sendPhaseLabel}</span>
            </div>
          ) : null}

          <NewsletterCampaignHistory
            ref={historyRef}
            templateId={template.id}
            highlightCampaignId={highlightCampaignId}
            autoExpandLatest
          />
        </section>
      </div>

    </AdminShell>
  );
}
