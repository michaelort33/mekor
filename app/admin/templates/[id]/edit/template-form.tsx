"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { type newsletterTemplates } from "@/db/schema";
import styles from "../../new/page.module.css";

type TemplateRow = typeof newsletterTemplates.$inferSelect;

type EditTemplateFormProps = {
  template: TemplateRow;
};

export function EditTemplateForm({ template }: EditTemplateFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
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

  async function save() {
    setError("");
    setSaving(true);

    const response = await fetch("/api/admin/templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (response.ok) {
      router.push("/admin/templates");
      router.refresh();
      return;
    }

    setError("Unable to save template.");
    setSaving(false);
  }

  async function deleteTemplate() {
    const shouldDelete = window.confirm("Delete this template?");
    if (!shouldDelete) return;

    setError("");
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Edit Newsletter Template</h1>
        <Link href="/admin/templates" className={styles.backLink}>
          ← Back to templates
        </Link>
      </header>

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
            <textarea
              className={styles.htmlEditor}
              value={form.bodyHtml}
              onChange={(e) => update("bodyHtml", e.target.value)}
              spellCheck={false}
            />
          </fieldset>

          {error ? <p>{error}</p> : null}

          <button type="button" className={styles.saveButton} onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            className={styles.saveButton}
            onClick={deleteTemplate}
            disabled={deleting}
            style={{ marginTop: "0.75rem", background: "#ffffff", color: "#9f1239", border: "1px solid #fda4af" }}
          >
            {deleting ? "Deleting..." : "Delete Template"}
          </button>
        </div>

        <div className={styles.previewColumn}>
          <h3 className={styles.previewTitle}>Live Preview</h3>
          <div className={styles.previewFrame}>
            <div dangerouslySetInnerHTML={{ __html: form.bodyHtml }} />
          </div>
        </div>
      </div>
    </div>
  );
}
