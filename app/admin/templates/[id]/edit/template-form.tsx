"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import adminStyles from "@/components/admin/admin-shell.module.css";
import { buildSendFeedback } from "@/lib/admin/send-feedback";
import { type newsletterTemplates } from "@/db/schema";
import styles from "../../new/page.module.css";

type TemplateRow = typeof newsletterTemplates.$inferSelect;

type EditTemplateFormProps = {
  template: TemplateRow;
};

type RecipientGroup = "all_members" | "admins_only" | "dues_outstanding" | "directory_visible";

type Campaign = {
  id: number;
  recipientGroup: RecipientGroup;
  recipientCount: number;
  successCount: number;
  failedCount: number;
  status: "sending" | "completed" | "partial" | "failed";
  startedAt: string;
  completedAt: string | null;
  sentByDisplayName: string;
  sentByEmail: string;
};

type Delivery = {
  id: number;
  recipientEmail: string;
  recipientName: string;
  status: "sent" | "failed";
  errorMessage: string;
  sentAt: string | null;
};

type ActivityLog = {
  id: number;
  actorDisplayName: string;
  actorEmail: string;
  action: string;
  targetId: string;
  payloadJson: Record<string, unknown>;
  createdAt: string;
};

const GROUP_OPTIONS: Array<{ value: RecipientGroup; label: string }> = [
  { value: "all_members", label: "All members" },
  { value: "admins_only", label: "Admins only" },
  { value: "dues_outstanding", label: "Members with dues outstanding" },
  { value: "directory_visible", label: "Directory-visible members" },
];
const GROUP_LABEL_MAP: Record<RecipientGroup, string> = Object.fromEntries(
  GROUP_OPTIONS.map((option) => [option.value, option.label]),
) as Record<RecipientGroup, string>;

export function EditTemplateForm({ template }: EditTemplateFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [previewingGroup, setPreviewingGroup] = useState(false);
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [campaignError, setCampaignError] = useState("");
  const [campaignNotice, setCampaignNotice] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [deliveriesByCampaign, setDeliveriesByCampaign] = useState<Record<string, Delivery[]>>({});
  const [sendGroup, setSendGroup] = useState<RecipientGroup>("all_members");
  const [subjectOverride, setSubjectOverride] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [groupPreview, setGroupPreview] = useState<{
    count: number;
    sample: Array<{ userId: number; email: string; displayName: string }>;
  } | null>(null);

  const [design, setDesign] = useState({
    preset: "modern" as "classic" | "modern" | "celebration",
    subtitle: template.shabbatDate || "",
    intro: "",
    primarySectionTitle: template.parshaName || "Shabbat Schedule",
    primarySectionBody: "",
    secondarySectionTitle: "Announcements",
    secondarySectionBody: "",
    footer: "Mekor Habracha · 1500 Walnut St Suite 206, Philadelphia, PA",
  });

  const [form, setForm] = useState({
    id: template.id,
    title: template.title,
    subject: template.subject,
    parshaName: template.parshaName,
    shabbatDate: template.shabbatDate,
    hebrewDate: template.hebrewDate,
    candleLighting: template.candleLighting,
    bodyHtml: template.bodyHtml,
    status: template.status,
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateDesign(field: string, value: string) {
    setDesign((prev) => ({ ...prev, [field]: value }));
  }

  async function persistTemplate() {
    const response = await fetch("/api/admin/templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!response.ok) {
      return false;
    }
    return true;
  }

  async function loadCampaigns() {
    setLoadingCampaigns(true);
    const response = await fetch(`/api/admin/templates/campaigns?templateId=${template.id}&limit=12`);
    const payload = (await response.json().catch(() => ({}))) as {
      campaigns?: Campaign[];
      deliveriesByCampaign?: Record<string, Delivery[]>;
    };
    if (response.ok) {
      setCampaigns(payload.campaigns ?? []);
      setDeliveriesByCampaign(payload.deliveriesByCampaign ?? {});
    }
    setLoadingCampaigns(false);
  }

  async function loadActivityLogs() {
    setLoadingActivity(true);
    const response = await fetch(`/api/admin/templates/logs?templateId=${template.id}&limit=30`);
    const payload = (await response.json().catch(() => ({}))) as {
      items?: ActivityLog[];
    };
    if (response.ok) {
      setActivityLogs(payload.items ?? []);
    }
    setLoadingActivity(false);
  }

  useEffect(() => {
    loadCampaigns().catch(() => setLoadingCampaigns(false));
    loadActivityLogs().catch(() => setLoadingActivity(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.id]);

  async function generateDesign() {
    setError("");
    setNotice("");
    setGenerating(true);

    const response = await fetch("/api/admin/templates/design", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: form.id,
        preset: design.preset,
        title: form.title || "Weekly Newsletter",
        subtitle: design.subtitle,
        intro: design.intro,
        primarySectionTitle: design.primarySectionTitle,
        primarySectionBody: design.primarySectionBody,
        secondarySectionTitle: design.secondarySectionTitle,
        secondarySectionBody: design.secondarySectionBody,
        footer: design.footer,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { bodyHtml?: string; error?: string };
    if (!response.ok || !payload.bodyHtml) {
      setError(payload.error || "Unable to generate design");
      setGenerating(false);
      return;
    }

    update("bodyHtml", payload.bodyHtml);
    setNotice("New HTML design generated.");
    setGenerating(false);
    await loadActivityLogs();
  }

  async function generateWithAi() {
    if (!aiPrompt.trim()) {
      setError("Add a prompt for OpenAI.");
      return;
    }
    setError("");
    setNotice("");
    setAiGenerating(true);

    const response = await fetch("/api/admin/templates/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "update",
        templateId: form.id,
        prompt: aiPrompt.trim(),
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
      template?: {
        title: string;
        subject: string;
        parshaName: string;
        shabbatDate: string;
        hebrewDate: string;
        candleLighting: string;
        bodyHtml: string;
        summary: string;
      };
    };
    if (!response.ok || !payload.template) {
      setError(payload.error || "Unable to generate with OpenAI");
      setAiGenerating(false);
      return;
    }
    setForm((prev) => ({
      ...prev,
      title: payload.template!.title,
      subject: payload.template!.subject,
      parshaName: payload.template!.parshaName,
      shabbatDate: payload.template!.shabbatDate,
      hebrewDate: payload.template!.hebrewDate,
      candleLighting: payload.template!.candleLighting,
      bodyHtml: payload.template!.bodyHtml,
    }));
    setNotice(payload.template.summary || "OpenAI updated this template.");
    setAiGenerating(false);
    await loadActivityLogs();
  }

  async function save() {
    setError("");
    setNotice("");
    setSaving(true);
    const ok = await persistTemplate();
    if (ok) {
      setNotice("Template saved.");
      router.refresh();
      await loadActivityLogs();
      setSaving(false);
      return;
    }

    setError("Unable to save template.");
    setSaving(false);
  }

  async function deleteTemplate() {
    const shouldDelete = window.confirm("Delete this template?");
    if (!shouldDelete) return;

    setError("");
    setNotice("");
    setDeleting(true);

    const response = await fetch(`/api/admin/templates?id=${form.id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      router.push("/admin/templates");
      router.refresh();
      return;
    }

    setError("Unable to delete template.");
    setDeleting(false);
  }

  async function previewGroup() {
    setCampaignError("");
    setCampaignNotice("");
    setPreviewingGroup(true);
    const response = await fetch("/api/admin/templates/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: form.id,
        recipientGroup: sendGroup,
        mode: "preview",
        subjectOverride: subjectOverride || undefined,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      count?: number;
      sample?: Array<{ userId: number; email: string; displayName: string }>;
      error?: string;
    };
    if (!response.ok) {
      setCampaignError(payload.error || "Unable to preview group.");
      setPreviewingGroup(false);
      return;
    }
    setGroupPreview({
      count: payload.count ?? 0,
      sample: payload.sample ?? [],
    });
    setPreviewingGroup(false);
  }

  async function sendCampaign() {
    const ok = window.confirm("Send this newsletter now?");
    if (!ok) return;

    setCampaignError("");
    setCampaignNotice("");
    setSendingCampaign(true);

    const saved = await persistTemplate();
    if (!saved) {
      setCampaignError("Save failed. Fix template issues before sending.");
      setSendingCampaign(false);
      return;
    }

    const response = await fetch("/api/admin/templates/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: form.id,
        recipientGroup: sendGroup,
        mode: "send",
        subjectOverride: subjectOverride || undefined,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      recipientCount?: number;
      successCount?: number;
      failedCount?: number;
      status?: string;
    };
    if (!response.ok) {
      setCampaignError(payload.error || "Unable to send campaign.");
      setSendingCampaign(false);
      return;
    }

    const feedback = buildSendFeedback({
      label: "Campaign",
      successCount: payload.successCount ?? 0,
      failedCount: payload.failedCount ?? 0,
      skippedCount: 0,
    });
    if (feedback.status === "failure") {
      setCampaignError(feedback.message);
    } else {
      setCampaignNotice(feedback.message);
    }
    setSendingCampaign(false);
    await loadCampaigns();
    router.refresh();
  }

  return (
    <AdminShell
      currentPath="/admin/templates"
      title="Edit Newsletter Template"
      description="Update content, preview recipients, and send without leaving the template workflow."
      breadcrumbs={[
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/templates", label: "Templates" },
        { label: "Edit template" },
      ]}
      actions={<Link href="/admin/templates" className={adminStyles.actionPill}>Back to templates</Link>}
    >

      <div className={styles.layout}>
        <div className={styles.formColumn}>
          <fieldset className={styles.fieldset}>
            <legend>Template Details</legend>
            <label className={styles.field}>
              <span>Title</span>
              <input type="text" value={form.title} onChange={(e) => update("title", e.target.value)} />
            </label>
            <label className={styles.field}>
              <span>Email Subject</span>
              <input type="text" value={form.subject} onChange={(e) => update("subject", e.target.value)} />
            </label>
            <div className={styles.fieldRow}>
              <label className={styles.field}>
                <span>Parsha Name</span>
                <input type="text" value={form.parshaName} onChange={(e) => update("parshaName", e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Candle Lighting</span>
                <input type="text" value={form.candleLighting} onChange={(e) => update("candleLighting", e.target.value)} />
              </label>
            </div>
            <div className={styles.fieldRow}>
              <label className={styles.field}>
                <span>Shabbat Date</span>
                <input type="text" value={form.shabbatDate} onChange={(e) => update("shabbatDate", e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Hebrew Date</span>
                <input type="text" value={form.hebrewDate} onChange={(e) => update("hebrewDate", e.target.value)} />
              </label>
            </div>
            <label className={styles.field}>
              <span>Status</span>
              <select value={form.status} onChange={(e) => update("status", e.target.value)}>
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
                <option value="sent">Sent</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend>Email Body HTML</legend>
            <div className={styles.designTools}>
              <h3>Design Generator</h3>
              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  <span>Preset</span>
                  <select value={design.preset} onChange={(event) => updateDesign("preset", event.target.value)}>
                    <option value="modern">Modern</option>
                    <option value="classic">Classic</option>
                    <option value="celebration">Celebration</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Subtitle</span>
                  <input
                    type="text"
                    value={design.subtitle}
                    onChange={(event) => updateDesign("subtitle", event.target.value)}
                  />
                </label>
              </div>
              <label className={styles.field}>
                <span>Intro</span>
                <textarea value={design.intro} onChange={(event) => updateDesign("intro", event.target.value)} rows={3} />
              </label>
              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  <span>Primary section title</span>
                  <input
                    type="text"
                    value={design.primarySectionTitle}
                    onChange={(event) => updateDesign("primarySectionTitle", event.target.value)}
                  />
                </label>
                <label className={styles.field}>
                  <span>Secondary section title</span>
                  <input
                    type="text"
                    value={design.secondarySectionTitle}
                    onChange={(event) => updateDesign("secondarySectionTitle", event.target.value)}
                  />
                </label>
              </div>
              <label className={styles.field}>
                <span>Primary section body</span>
                <textarea
                  value={design.primarySectionBody}
                  onChange={(event) => updateDesign("primarySectionBody", event.target.value)}
                  rows={4}
                />
              </label>
              <label className={styles.field}>
                <span>Secondary section body</span>
                <textarea
                  value={design.secondarySectionBody}
                  onChange={(event) => updateDesign("secondarySectionBody", event.target.value)}
                  rows={4}
                />
              </label>
              <label className={styles.field}>
                <span>Footer</span>
                <input
                  type="text"
                  value={design.footer}
                  onChange={(event) => updateDesign("footer", event.target.value)}
                />
              </label>
              <button type="button" className={styles.secondaryButton} onClick={generateDesign} disabled={generating}>
                {generating ? "Generating..." : "Generate HTML design"}
              </button>
            </div>
            <div className={styles.designTools}>
              <h3>OpenAI Template Writer</h3>
              <label className={styles.field}>
                <span>Prompt</span>
                <textarea
                  value={aiPrompt}
                  onChange={(event) => setAiPrompt(event.target.value)}
                  rows={4}
                  placeholder="Example: tighten this for readability, add a short family callout, and keep the same schedule details."
                />
              </label>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={generateWithAi}
                disabled={aiGenerating}
              >
                {aiGenerating ? "Generating with OpenAI..." : "Update with OpenAI"}
              </button>
            </div>

            <textarea
              className={styles.htmlEditor}
              value={form.bodyHtml}
              onChange={(e) => update("bodyHtml", e.target.value)}
              spellCheck={false}
            />
          </fieldset>

          {error ? <p className={styles.error}>{error}</p> : null}
          {notice ? <p className={styles.notice}>{notice}</p> : null}

          <button type="button" className={styles.saveButton} onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={deleteTemplate}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete Template"}
          </button>

          <fieldset className={styles.fieldset}>
            <legend>Send Campaign</legend>
            <div className={styles.fieldRow}>
              <label className={styles.field}>
                <span>Recipient group</span>
                <select value={sendGroup} onChange={(event) => setSendGroup(event.target.value as RecipientGroup)}>
                  {GROUP_OPTIONS.map((group) => (
                    <option key={group.value} value={group.value}>
                      {group.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Subject override (optional)</span>
                <input
                  type="text"
                  value={subjectOverride}
                  onChange={(event) => setSubjectOverride(event.target.value)}
                />
              </label>
            </div>
            <div className={styles.actionRow}>
              <button type="button" className={styles.secondaryButton} onClick={previewGroup} disabled={previewingGroup}>
                {previewingGroup ? "Loading..." : "Preview recipients"}
              </button>
              <button type="button" className={styles.saveButton} onClick={sendCampaign} disabled={sendingCampaign}>
                {sendingCampaign ? "Sending..." : "Send via SendGrid"}
              </button>
            </div>
            {campaignError ? <p className={styles.error}>{campaignError}</p> : null}
            {campaignNotice ? <p className={styles.notice}>{campaignNotice}</p> : null}

            {groupPreview ? (
              <div className={styles.previewRecipients}>
                <p>
                  <strong>{groupPreview.count}</strong> recipients
                </p>
                <ul>
                  {groupPreview.sample.map((recipient) => (
                    <li key={recipient.userId}>
                      {recipient.displayName} ({recipient.email})
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend>Campaign History</legend>
            {loadingCampaigns ? <p>Loading campaigns...</p> : null}
            {!loadingCampaigns && campaigns.length === 0 ? <p>No campaigns sent yet.</p> : null}
            {!loadingCampaigns && campaigns.length > 0 ? (
              <div className={styles.campaignList}>
                {campaigns.map((campaign) => (
                  <article key={campaign.id} className={styles.campaignCard}>
                    <p>
                      <strong>{campaign.status}</strong> · {campaign.successCount}/{campaign.recipientCount} sent
                    </p>
                    <p>
                      Group: {GROUP_LABEL_MAP[campaign.recipientGroup]} · Started:{" "}
                      {new Date(campaign.startedAt).toLocaleString()}
                    </p>
                    <p>
                      By {campaign.sentByDisplayName} ({campaign.sentByEmail})
                    </p>
                    {deliveriesByCampaign[String(campaign.id)]?.length ? (
                      <details>
                        <summary>Recent deliveries</summary>
                        <ul>
                          {deliveriesByCampaign[String(campaign.id)]!.map((delivery) => (
                            <li key={delivery.id}>
                              {delivery.status} · {delivery.recipientEmail}
                              {delivery.errorMessage ? ` · ${delivery.errorMessage}` : ""}
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : null}
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend>Template Activity Log</legend>
            {loadingActivity ? <p>Loading activity...</p> : null}
            {!loadingActivity && activityLogs.length === 0 ? <p>No activity logged yet.</p> : null}
            {!loadingActivity && activityLogs.length > 0 ? (
              <div className={styles.campaignList}>
                {activityLogs.map((log) => (
                  <article key={log.id} className={styles.campaignCard}>
                    <p>
                      <strong>{log.action}</strong>
                    </p>
                    <p>
                      By {log.actorDisplayName} ({log.actorEmail})
                    </p>
                    <p>{new Date(log.createdAt).toLocaleString()}</p>
                  </article>
                ))}
              </div>
            ) : null}
          </fieldset>
        </div>

        <div className={styles.previewColumn}>
          <h3 className={styles.previewTitle}>Live Preview</h3>
          <div className={styles.previewFrame}>
            <div dangerouslySetInnerHTML={{ __html: form.bodyHtml }} />
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
