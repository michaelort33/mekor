"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import adminStyles from "@/components/admin/admin-shell.module.css";
import { NewsletterFlowSteps } from "@/components/admin/newsletter-flow-steps";
import { sanitizeNewsletterHtml } from "@/lib/newsletter/html-sanitize";
import {
  NEWSLETTER_AUDIENCE_OPTIONS,
  type NewsletterAudienceKey,
} from "@/lib/newsletter/recipient-lists";
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

type BaseOption = {
  key: string;
  kind: StarterKind;
  templateId: number | null;
  title: string;
  description: string;
  meta: string;
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
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [audienceQuery, setAudienceQuery] = useState("");
  const [audienceMenuOpen, setAudienceMenuOpen] = useState(false);
  const [selectedAudience, setSelectedAudience] = useState<NewsletterAudienceKey>("michael_test");
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

  function redirectToLogin() {
    router.push("/login?next=/admin/templates/new");
  }

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/admin/templates?summary=true", {
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        templates?: TemplateOption[];
        error?: string;
      };
      if (response.status === 401) {
        redirectToLogin();
        return;
      }
      if (!response.ok) {
        setError(payload.error || "Unable to load existing newsletters.");
        setLoadingTemplates(false);
        return;
      }
      setTemplates(payload.templates ?? []);
      setLoadingTemplates(false);
    })();
  }, []);

  const baseOptions = useMemo<BaseOption[]>(() => [
    {
      key: "weekly-cleaned",
      kind: "weekly-cleaned",
      templateId: null,
      title: WEEKLY_CLEANED_TEMPLATE_TITLE,
      description: "Lean weekly structure with this week's schedule, sponsors, and Bulletin Board links",
      meta: "Recommended starter",
    },
    {
      key: "blank",
      kind: "blank",
      templateId: null,
      title: "Blank canvas",
      description: "Ask AI to create the newsletter and email HTML from scratch",
      meta: "Start fresh",
    },
    ...templates.map((template) => ({
      key: `template-${template.id}`,
      kind: "existing" as const,
      templateId: template.id,
      title: template.title,
      description: template.subject || "No subject",
      meta: `${template.parshaName || "Newsletter"} · ${new Date(template.updatedAt).toLocaleDateString()}`,
    })),
  ], [templates]);

  const filteredBaseOptions = useMemo(() => {
    const query = templateQuery.trim().toLowerCase();
    if (!query) return baseOptions.slice(0, 14);
    return baseOptions
      .filter((option) =>
        [option.title, option.description, option.meta]
          .some((value) => value.toLowerCase().includes(query)),
      )
      .slice(0, 14);
  }, [baseOptions, templateQuery]);

  const selectedBaseOption = baseOptions.find((option) =>
    option.kind === starterKind && (starterKind !== "existing" || option.templateId === selectedBaseId),
  ) ?? baseOptions[0];

  const filteredAudienceOptions = useMemo(() => {
    const query = audienceQuery.trim().toLowerCase();
    if (!query) return NEWSLETTER_AUDIENCE_OPTIONS;
    return NEWSLETTER_AUDIENCE_OPTIONS.filter((option) =>
      [option.name, option.description].some((value) => value.toLowerCase().includes(query)),
    );
  }, [audienceQuery]);

  const selectedAudienceOption = NEWSLETTER_AUDIENCE_OPTIONS.find((option) => option.key === selectedAudience)!;

  const previewHtml = useMemo(() => sanitizeNewsletterHtml(form.bodyHtml), [form.bodyHtml]);

  function update<K extends keyof TemplateDraft>(field: K, value: TemplateDraft[K]) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function chooseBase(option: BaseOption) {
    setStarterKind(option.kind);
    setSelectedBaseId(option.templateId);
    setTemplateQuery("");
    setTemplateMenuOpen(false);
  }

  function chooseAudience(key: NewsletterAudienceKey) {
    setSelectedAudience(key);
    setAudienceQuery("");
    setAudienceMenuOpen(false);
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
      const response = await fetch(`/api/admin/templates?id=${selected.id}`, {
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        template?: ExistingTemplate;
        error?: string;
      };
      if (response.status === 401) {
        redirectToLogin();
        setLoadingBase(false);
        return;
      }
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
      credentials: "same-origin",
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

    if (response.status === 401) {
      setError("Your admin session expired. Sign in again to continue.");
      setAiGenerating(false);
      redirectToLogin();
      return;
    }

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
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      template?: { id: number };
      error?: string;
    };
    if (response.status === 401) {
      setError("Your admin session expired. Sign in again to continue.");
      setSaving(false);
      redirectToLogin();
      return;
    }
    if (!response.ok || !payload.template) {
      setError(payload.error || "Unable to save the newsletter.");
      setSaving(false);
      return;
    }

    router.push(`/admin/templates/${payload.template.id}/studio?from=new&audience=${selectedAudience}`);
    router.refresh();
  }

  const flowStep = step === "start" ? "start" : saving ? "review" : "build";

  return (
    <AdminShell
      currentPath="/admin/templates"
      title="New Newsletter"
      description="Choose a starting point, shape the newsletter with AI, then continue to Studio to review and send."
      breadcrumbs={[
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/templates", label: "Newsletters" },
        { label: "New newsletter" },
      ]}
      actions={<Link href="/admin/templates" className={adminStyles.actionPill}>Back to newsletters</Link>}
    >
      <NewsletterFlowSteps current={flowStep} ariaLabel="Newsletter creation steps" />

      {step === "start" ? (
        <section className={styles.startPanel} aria-labelledby="starting-point-title">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>Step 1</p>
            <h2 id="starting-point-title">Choose the base and audience</h2>
            <p>
              Search for a starting template, then choose who this newsletter is intended for. Nothing is emailed from
              this page — Studio still gives you a final audience check before send.
            </p>
          </div>

          <div className={styles.selectorGrid}>
            <div
              className={styles.searchablePicker}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setTemplateMenuOpen(false);
              }}
            >
              <div className={styles.selectorLabel}>
                <span>Base template</span>
                <small>Searchable dropdown</small>
              </div>
              <button
                type="button"
                className={styles.selectorTrigger}
                role="combobox"
                aria-label="Base template"
                aria-expanded={templateMenuOpen}
                aria-controls="base-template-options"
                aria-haspopup="listbox"
                onClick={() => setTemplateMenuOpen((open) => !open)}
              >
                <span className={styles.selectorIcon} aria-hidden="true">✦</span>
                <span className={styles.selectorValue}>
                  <strong>{selectedBaseOption.title}</strong>
                  <span>{selectedBaseOption.description}</span>
                </span>
                <span className={styles.selectorAction}>Search & change <span aria-hidden="true">⌄</span></span>
              </button>
              {templateMenuOpen ? (
                <div className={styles.selectorPopover}>
                  <label className={styles.selectorSearch} htmlFor="base-template-search">
                    <span>Search base templates</span>
                    <input
                      id="base-template-search"
                      type="search"
                      value={templateQuery}
                      onChange={(event) => setTemplateQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") setTemplateMenuOpen(false);
                      }}
                      placeholder="Search title, subject, or parsha…"
                      autoComplete="off"
                    />
                  </label>
                  <div id="base-template-options" className={styles.selectorOptions} role="listbox" aria-label="Base templates">
                    {loadingTemplates ? <p className={styles.selectorEmpty}>Loading newsletters…</p> : null}
                    {!loadingTemplates && filteredBaseOptions.length === 0 ? (
                      <p className={styles.selectorEmpty}>No matching base templates.</p>
                    ) : null}
                    {filteredBaseOptions.map((option) => {
                      const selected = option.key === selectedBaseOption.key;
                      return (
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          key={option.key}
                          className={selected ? styles.selectorOptionActive : styles.selectorOption}
                          onClick={() => chooseBase(option)}
                        >
                          <span>
                            <strong>{option.title}</strong>
                            <small>{option.description}</small>
                          </span>
                          <span>{selected ? "Selected" : option.meta}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <div
              className={styles.searchablePicker}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setAudienceMenuOpen(false);
              }}
            >
              <div className={styles.selectorLabel}>
                <span>Newsletter audience</span>
                <small>Searchable dropdown</small>
              </div>
              <button
                type="button"
                className={styles.selectorTrigger}
                role="combobox"
                aria-label="Newsletter audience"
                aria-expanded={audienceMenuOpen}
                aria-controls="newsletter-audience-options"
                aria-haspopup="listbox"
                onClick={() => setAudienceMenuOpen((open) => !open)}
              >
                <span className={styles.selectorIcon} aria-hidden="true">◎</span>
                <span className={styles.selectorValue}>
                  <strong>{selectedAudienceOption.name}</strong>
                  <span>{selectedAudienceOption.description}</span>
                </span>
                <span className={styles.selectorAction}>Search & change <span aria-hidden="true">⌄</span></span>
              </button>
              {audienceMenuOpen ? (
                <div className={styles.selectorPopover}>
                  <label className={styles.selectorSearch} htmlFor="newsletter-audience-search">
                    <span>Search newsletter audiences</span>
                    <input
                      id="newsletter-audience-search"
                      type="search"
                      value={audienceQuery}
                      onChange={(event) => setAudienceQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") setAudienceMenuOpen(false);
                      }}
                      placeholder="Search audience name or purpose…"
                      autoComplete="off"
                    />
                  </label>
                  <div id="newsletter-audience-options" className={styles.selectorOptions} role="listbox" aria-label="Newsletter audiences">
                    {filteredAudienceOptions.length === 0 ? (
                      <p className={styles.selectorEmpty}>No matching audiences.</p>
                    ) : null}
                    {filteredAudienceOptions.map((option) => {
                      const selected = option.key === selectedAudience;
                      return (
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          key={option.key}
                          className={selected ? styles.selectorOptionActive : styles.selectorOption}
                          onClick={() => chooseAudience(option.key)}
                        >
                          <span>
                            <strong>{option.name}</strong>
                            <small>{option.description}</small>
                          </span>
                          <span>{selected ? "Selected" : "Choose"}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {error ? <p className={styles.error}>{error}</p> : null}
          <div className={styles.startActions}>
            <p>
              Audience: <strong>{selectedAudienceOption.name}</strong>. You can make AI edits now and confirm or change
              the audience again before sending.
            </p>
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
              <p className={styles.builderAudience}>Planned audience: {selectedAudienceOption.name}</p>
            </div>
            <div className={styles.builderActions}>
              <button type="button" className={styles.ghostButton} onClick={() => setStep("start")}>
                Change starting point
              </button>
              <div className={styles.saveAction}>
                <button type="button" className={styles.primaryButton} onClick={() => void save()} disabled={saving}>
                  {saving ? "Saving…" : "Save & continue to send"}
                </button>
                <small>Next: review the live preview in Studio, pick recipients (try Michael test list), and send.</small>
              </div>
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
                  <small>Each message works from the latest HTML. When you are ready, save and continue to Studio to send.</small>
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
