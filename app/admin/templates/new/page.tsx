"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import adminStyles from "@/components/admin/admin-shell.module.css";
import { sanitizeNewsletterHtml } from "@/lib/newsletter/html-sanitize";
import {
  buildWeeklyCleanedTemplateDraft,
  WEEKLY_CLEANED_TEMPLATE_TITLE,
} from "@/lib/newsletter/weekly-cleaned";
import styles from "./page.module.css";

type StarterKind = "blank" | "weekly-cleaned" | "existing";

type TemplateDraft = {
  title: string;
  subject: string;
  parshaName: string;
  shabbatDate: string;
  hebrewDate: string;
  candleLighting: string;
  bodyHtml: string;
  status: "draft";
};

type TemplateOption = {
  id: number;
  title: string;
  subject: string;
  parshaName: string;
  status: "draft" | "ready" | "sent" | "archived";
  updatedAt: string;
};

type ExistingTemplate = Omit<TemplateDraft, "status"> & {
  status: "draft" | "ready" | "sent" | "archived";
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const EMPTY_DRAFT: TemplateDraft = {
  title: "",
  subject: "",
  parshaName: "",
  shabbatDate: "",
  hebrewDate: "",
  candleLighting: "",
  bodyHtml: "",
  status: "draft",
};

const PROMPT_IDEAS = [
  "Fill in this week’s parsha, dates, candle lighting, and Shabbat schedule.",
  "Keep evergreen items as Bulletin Board links — only expand this week’s announcements.",
  "Tighten the sponsors section and weekday services for phone reading.",
];

function messageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function NewTemplatePage() {
  const router = useRouter();
  const [step, setStep] = useState<"start" | "compose">("start");
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templateQuery, setTemplateQuery] = useState("");
  const [starterKind, setStarterKind] = useState<StarterKind>("weekly-cleaned");
  const [selectedBaseId, setSelectedBaseId] = useState<number | null>(null);
  const [baseLabel, setBaseLabel] = useState(WEEKLY_CLEANED_TEMPLATE_TITLE);
  const [form, setForm] = useState<TemplateDraft>(EMPTY_DRAFT);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loadingBase, setLoadingBase] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/admin/templates?summary=true");
      const payload = (await response.json().catch(() => ({}))) as {
        templates?: TemplateOption[];
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error || "Unable to load existing newsletters.");
        setLoadingTemplates(false);
        return;
      }
      setTemplates(payload.templates ?? []);
      setLoadingTemplates(false);
    })();
  }, []);

  const filteredTemplates = useMemo(() => {
    const query = templateQuery.trim().toLowerCase();
    if (!query) return templates.slice(0, 12);
    return templates
      .filter((template) =>
        [template.title, template.subject, template.parshaName]
          .some((value) => value.toLowerCase().includes(query)),
      )
      .slice(0, 12);
  }, [templateQuery, templates]);

  const previewHtml = useMemo(() => sanitizeNewsletterHtml(form.bodyHtml), [form.bodyHtml]);

  function update<K extends keyof TemplateDraft>(field: K, value: TemplateDraft[K]) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function beginComposing() {
    if (starterKind === "existing") {
      const selected = selectedBaseId === null
        ? null
        : templates.find((template) => template.id === selectedBaseId);

      if (!selected) {
        setError("Choose an available starting newsletter.");
        return;
      }

      setError("");
      setLoadingBase(true);
      const response = await fetch(`/api/admin/templates?id=${selected.id}`);
      const payload = (await response.json().catch(() => ({}))) as {
        template?: ExistingTemplate;
        error?: string;
      };
      if (!response.ok || !payload.template) {
        setError(payload.error || "Unable to load that starting newsletter.");
        setLoadingBase(false);
        return;
      }
      setForm({
        title: `${payload.template.title} — copy`,
        subject: payload.template.subject,
        parshaName: payload.template.parshaName,
        shabbatDate: payload.template.shabbatDate,
        hebrewDate: payload.template.hebrewDate,
        candleLighting: payload.template.candleLighting,
        bodyHtml: payload.template.bodyHtml,
        status: "draft",
      });
      setBaseLabel(payload.template.title);
      setLoadingBase(false);
      setMessages([]);
      setStep("compose");
      return;
    }

    setError("");
    if (starterKind === "weekly-cleaned") {
      const draft = buildWeeklyCleanedTemplateDraft();
      setForm({
        title: draft.title,
        subject: draft.subject,
        parshaName: draft.parshaName,
        shabbatDate: draft.shabbatDate,
        hebrewDate: draft.hebrewDate,
        candleLighting: draft.candleLighting,
        bodyHtml: draft.bodyHtml,
        status: "draft",
      });
      setBaseLabel(WEEKLY_CLEANED_TEMPLATE_TITLE);
    } else {
      setForm(EMPTY_DRAFT);
      setBaseLabel("Blank canvas");
    }
    setMessages([]);
    setStep("compose");
  }

  async function sendPrompt(event: FormEvent) {
    event.preventDefault();
    const instruction = prompt.trim();
    if (!instruction || aiGenerating) return;

    const userMessage: ChatMessage = { id: messageId(), role: "user", text: instruction };
    setMessages((previous) => [...previous, userMessage]);
    setPrompt("");
    setError("");
    setAiGenerating(true);

    const response = await fetch("/api/admin/templates/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: form.bodyHtml.trim() ? "update" : "generate",
        prompt: instruction,
        history: messages.slice(-10).map((message) => ({
          role: message.role,
          content: message.text,
        })),
        title: form.title,
        subject: form.subject,
        parshaName: form.parshaName,
        shabbatDate: form.shabbatDate,
        hebrewDate: form.hebrewDate,
        candleLighting: form.candleLighting,
        bodyHtml: form.bodyHtml,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      template?: Omit<TemplateDraft, "status"> & { summary: string };
    };

    if (!response.ok || !payload.template) {
      setError(payload.error || "Unable to update the newsletter with AI.");
      setAiGenerating(false);
      return;
    }

    setForm((previous) => ({
      ...previous,
      title: payload.template!.title,
      subject: payload.template!.subject,
      parshaName: payload.template!.parshaName,
      shabbatDate: payload.template!.shabbatDate,
      hebrewDate: payload.template!.hebrewDate,
      candleLighting: payload.template!.candleLighting,
      bodyHtml: payload.template!.bodyHtml,
    }));
    setMessages((previous) => [
      ...previous,
      {
        id: messageId(),
        role: "assistant",
        text: payload.template!.summary || "I updated the newsletter and refreshed the preview.",
      },
    ]);
    setAiGenerating(false);
  }

  async function save() {
    if (!form.bodyHtml.trim()) {
      setError("Create or add newsletter HTML before saving.");
      return;
    }
    if (!form.title.trim()) {
      setError("Give the newsletter a name before saving.");
      return;
    }

    setError("");
    setSaving(true);
    const response = await fetch("/api/admin/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      template?: { id: number };
      error?: string;
    };
    if (!response.ok || !payload.template) {
      setError(payload.error || "Unable to save the newsletter.");
      setSaving(false);
      return;
    }

    router.push(`/admin/templates/${payload.template.id}/studio`);
    router.refresh();
  }

  return (
    <AdminShell
      currentPath="/admin/templates"
      title="New Newsletter"
      description="Choose a starting point, shape the newsletter with AI, then save when it is ready."
      breadcrumbs={[
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/templates", label: "Newsletters" },
        { label: "New newsletter" },
      ]}
      actions={<Link href="/admin/templates" className={adminStyles.actionPill}>Back to newsletters</Link>}
    >
      <ol className={styles.steps} aria-label="Newsletter creation steps">
        <li className={step === "start" ? styles.activeStep : styles.completeStep}>
          <span>1</span>
          <div><strong>Starting point</strong><small>Blank or existing</small></div>
        </li>
        <li className={step === "compose" ? styles.activeStep : ""}>
          <span>2</span>
          <div><strong>Create with AI</strong><small>Iterate and preview</small></div>
        </li>
        <li>
          <span>3</span>
          <div><strong>Save</strong><small>Open in Studio</small></div>
        </li>
      </ol>

      {step === "start" ? (
        <section className={styles.startPanel} aria-labelledby="starting-point-title">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>Step 1</p>
            <h2 id="starting-point-title">What should this newsletter start from?</h2>
            <p>Start fresh, or copy an existing newsletter so AI can preserve its layout and make targeted changes.</p>
          </div>

          <button
            type="button"
            className={`${styles.blankCard} ${starterKind === "weekly-cleaned" ? styles.selectedCard : ""}`}
            onClick={() => {
              setStarterKind("weekly-cleaned");
              setSelectedBaseId(null);
            }}
            aria-pressed={starterKind === "weekly-cleaned"}
          >
            <span className={styles.blankIcon}>✦</span>
            <span>
              <strong>{WEEKLY_CLEANED_TEMPLATE_TITLE}</strong>
              <small>
                Lean weekly starter based on recent Shabbat issues — schedule, sponsors, this week only; evergreen
                links point to the Bulletin Board
              </small>
            </span>
            <span className={styles.selectionMark}>{starterKind === "weekly-cleaned" ? "Selected" : "Select"}</span>
          </button>

          <button
            type="button"
            className={`${styles.blankCard} ${starterKind === "blank" ? styles.selectedCard : ""}`}
            onClick={() => {
              setStarterKind("blank");
              setSelectedBaseId(null);
            }}
            aria-pressed={starterKind === "blank"}
          >
            <span className={styles.blankIcon}>＋</span>
            <span><strong>Blank canvas</strong><small>Ask AI to create the HTML from scratch</small></span>
            <span className={styles.selectionMark}>{starterKind === "blank" ? "Selected" : "Select"}</span>
          </button>

          <div className={styles.templatePicker}>
            <div className={styles.pickerHeader}>
              <div>
                <h3>Or use an existing newsletter</h3>
                <p>The source stays untouched. Saving creates a separate newsletter.</p>
              </div>
              <label className={styles.searchField}>
                <span>Search newsletters</span>
                <input
                  type="search"
                  value={templateQuery}
                  onChange={(event) => setTemplateQuery(event.target.value)}
                  placeholder="Title, subject, or parsha"
                />
              </label>
            </div>

            {loadingTemplates ? <p className={styles.loadingState}>Loading newsletters…</p> : null}
            {!loadingTemplates && filteredTemplates.length === 0 ? (
              <p className={styles.loadingState}>No matching newsletters.</p>
            ) : null}
            <div className={styles.templateGrid}>
              {filteredTemplates.map((template) => {
                const selected = starterKind === "existing" && selectedBaseId === template.id;
                return (
                  <button
                    type="button"
                    key={template.id}
                    className={`${styles.templateCard} ${selected ? styles.selectedCard : ""}`}
                    onClick={() => {
                      setStarterKind("existing");
                      setSelectedBaseId(template.id);
                    }}
                    aria-pressed={selected}
                  >
                    <span className={styles.templateMeta}>
                      {template.parshaName || "Newsletter"} · {new Date(template.updatedAt).toLocaleDateString()}
                    </span>
                    <strong>{template.title}</strong>
                    <small>{template.subject || "No subject"}</small>
                    <span className={styles.selectionMark}>{selected ? "Selected" : "Use this"}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {error ? <p className={styles.error}>{error}</p> : null}
          <div className={styles.startActions}>
            <p>You can make as many AI edits as you need before anything is saved.</p>
            <button type="button" className={styles.primaryButton} onClick={() => void beginComposing()} disabled={loadingBase}>
              {loadingBase ? "Loading starting point…" : "Continue to AI builder"}
            </button>
          </div>
        </section>
      ) : (
        <div className={styles.builder}>
          <div className={styles.builderToolbar}>
            <div>
              <p className={styles.eyebrow}>Starting from</p>
              <h2>{baseLabel}</h2>
            </div>
            <div className={styles.builderActions}>
              <button type="button" className={styles.ghostButton} onClick={() => setStep("start")}>
                Change starting point
              </button>
              <button type="button" className={styles.primaryButton} onClick={() => void save()} disabled={saving}>
                {saving ? "Saving…" : "Save newsletter"}
              </button>
            </div>
          </div>

          <section className={styles.detailsBar} aria-label="Newsletter details">
            <label>
              Newsletter name
              <input
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder="AI can fill this in"
              />
            </label>
            <label>
              Email subject
              <input
                value={form.subject}
                onChange={(event) => update("subject", event.target.value)}
                placeholder="AI can fill this in"
              />
            </label>
          </section>

          {error ? <p className={styles.error}>{error}</p> : null}

          <div className={styles.workspace}>
            <section className={styles.chatPanel} aria-label="AI newsletter conversation">
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.eyebrow}>Step 2</p>
                  <h3>Create with AI</h3>
                </div>
                <span className={styles.liveBadge}>Preview linked</span>
              </div>

              <div className={styles.messages} aria-live="polite">
                {messages.length === 0 ? (
                  <div className={styles.emptyChat}>
                    <span>✦</span>
                    <h4>{form.bodyHtml ? "Tell AI what to change" : "Describe the newsletter you want"}</h4>
                    <p>
                      {form.bodyHtml
                        ? "Small requests are welcome: adjust a color, rewrite one section, or move a block."
                        : "AI will create the complete email HTML and newsletter details from your first prompt."}
                    </p>
                    <div className={styles.promptIdeas}>
                      {PROMPT_IDEAS.map((idea) => (
                        <button type="button" key={idea} onClick={() => setPrompt(idea)}>{idea}</button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <article
                      key={message.id}
                      className={`${styles.message} ${message.role === "user" ? styles.userMessage : styles.assistantMessage}`}
                    >
                      <span>{message.role === "user" ? "You" : "Mekor AI"}</span>
                      <p>{message.text}</p>
                    </article>
                  ))
                )}
                {aiGenerating ? (
                  <article className={`${styles.message} ${styles.assistantMessage}`}>
                    <span>Mekor AI</span>
                    <p className={styles.thinking}>Updating the HTML and preview…</p>
                  </article>
                ) : null}
              </div>

              <form className={styles.composer} onSubmit={sendPrompt}>
                <label htmlFor="newsletter-ai-prompt">What should AI create or change?</label>
                <textarea
                  id="newsletter-ai-prompt"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  rows={4}
                  placeholder="Create from scratch, or ask for one small change…"
                  disabled={aiGenerating}
                />
                <div>
                  <small>Each message works from the latest HTML. Nothing is emailed from this page.</small>
                  <button type="submit" className={styles.sendButton} disabled={!prompt.trim() || aiGenerating}>
                    {aiGenerating ? "Working…" : "Send to AI"}
                  </button>
                </div>
              </form>
            </section>

            <section className={styles.previewPanel} aria-label="Newsletter preview">
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.eyebrow}>Live result</p>
                  <h3>Newsletter preview</h3>
                </div>
                <span className={styles.previewStatus}>{form.bodyHtml ? "Rendered HTML" : "Waiting for your first prompt"}</span>
              </div>
              <div className={styles.previewStage}>
                {previewHtml ? (
                  <iframe title="Newsletter live preview" sandbox="" srcDoc={previewHtml} />
                ) : (
                  <div className={styles.emptyPreview}>
                    <span>✦</span>
                    <p>Your newsletter will appear here as AI builds it.</p>
                  </div>
                )}
              </div>
              <details className={styles.htmlDetails}>
                <summary>Edit HTML directly</summary>
                <p>Advanced: manual changes update the preview immediately.</p>
                <textarea
                  value={form.bodyHtml}
                  onChange={(event) => update("bodyHtml", event.target.value)}
                  spellCheck={false}
                  aria-label="Newsletter HTML source"
                />
              </details>
            </section>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
