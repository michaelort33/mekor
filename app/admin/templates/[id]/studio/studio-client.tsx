"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { CircleAlertIcon, InfoIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/admin-shell";
import adminStyles from "@/components/admin/admin-shell.module.css";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { buildCampaignResultNotice } from "@/lib/admin/send-feedback";
import type { newsletterTemplates } from "@/db/schema";
import {
  bumpSaveGeneration,
  shouldResaveAfterPersist,
  shouldRunScheduledAutosave,
} from "@/lib/newsletter/studio-autosave";
import { extractLatestBodyHtmlFromMessages } from "@/lib/newsletter/studio-live-html";
import { StudioChatDrawer } from "./studio-chat-drawer";
import type { StudioSubscriberOption } from "./studio-recipient-picker";
import { StudioSendBar } from "./studio-send-bar";
import styles from "./page.module.css";

type TemplateRow = typeof newsletterTemplates.$inferSelect;

type StudioClientProps = {
  template: TemplateRow;
};

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
  const [selectedRecipients, setSelectedRecipients] = useState<StudioSubscriberOption[]>([]);

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

  function addRecipient(option: StudioSubscriberOption) {
    setSelectedRecipients((prev) => {
      if (prev.some((item) => item.personId === option.personId)) return prev;
      return [...prev, option];
    });
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
      if (feedback.status === "failure") {
        setError(feedback.message);
        toast.error(feedback.message);
      } else {
        setNotice(feedback.message);
        toast.success(feedback.message);
      }
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
            <Button type="button" variant="secondary" disabled={saving} onClick={() => void persistHtml()}>
              {saving ? "Saving…" : "Save HTML"}
            </Button>
            <Button type="button" onClick={() => void openChat()}>
              Show it in Chat
            </Button>
          </div>
        </div>

        {notice ? (
          <Alert>
            <InfoIcon />
            <AlertTitle>Update</AlertTitle>
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        ) : null}
        {error ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className={styles.split}>
          <section className={styles.panel} aria-label="HTML editor">
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>HTML</h3>
              <p className={styles.panelHint}>Autosaves as you type</p>
            </div>
            <Textarea
              className={`${styles.htmlEditor} min-h-0 flex-1 rounded-none border-0 shadow-none focus:ring-0`}
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

        <StudioSendBar
          subject={subject}
          onSubjectChange={setSubject}
          selectedRecipients={selectedRecipients}
          onAddRecipient={addRecipient}
          onRemoveRecipient={removeRecipient}
          onRecipientError={setError}
          sending={sending}
          confirmOpen={confirmSendOpen}
          onConfirmOpenChange={(open) => {
            setError("");
            setConfirmSendOpen(open);
          }}
          onPreview={() => void runCampaign("preview")}
          onConfirmSend={() => void runCampaign("send")}
        />
      </div>

      <StudioChatDrawer
        open={chatOpen}
        onOpenChange={setChatOpen}
        messages={messages}
        draft={draft}
        onDraftChange={setDraft}
        onSubmit={onSendChat}
        busy={busy}
        statusText={chatError ? chatError.message : busy ? "Agent working…" : "Ready"}
        onStop={() => stop()}
        inputRef={chatInputRef}
      />
    </AdminShell>
  );
}
