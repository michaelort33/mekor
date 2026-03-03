"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AdminTabs } from "@/components/admin/admin-tabs";
import styles from "./page.module.css";

const STARTER_HTML = `<div style="max-width:600px;margin:0 auto;font-family:Roboto,Helvetica Neue,Helvetica,Arial,sans-serif;color:#1a2a3a;line-height:1.6;">

<div style="text-align:center;padding:24px 20px 18px;background:linear-gradient(135deg,#2b5a81 0%,#1e3f5e 100%);border-radius:12px 12px 0 0;">
  <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:0.03em;">Parshat [Name]</h1>
  <p style="margin:6px 0 0;color:rgba(220,235,255,0.9);font-size:16px;">[Date] &middot; [Hebrew Date]</p>
</div>

<div style="padding:24px 20px;background:#f8fafc;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">

  <h2 style="margin:0 0 16px;color:#2b5a81;font-size:20px;border-bottom:2px solid #dde4ef;padding-bottom:10px;">🕯️ Shabbat Schedule</h2>

  <p style="margin:0 0 4px;"><strong style="color:#2b5a81;">Friday</strong></p>
  <p style="margin:0 0 2px;"><strong>0:00pm</strong> Candle Lighting</p>
  <p style="margin:0 0 12px;"><strong>0:00pm</strong> Mincha / Kabbalat Shabbat / Maariv</p>

  <p style="margin:0 0 4px;"><strong style="color:#2b5a81;">Shabbat</strong></p>
  <p style="margin:0 0 2px;"><strong>9:15am</strong> Morning Services</p>
  <p style="margin:0 0 2px;"><strong>10:00am</strong> Torah Reading</p>
  <p style="margin:0 0 2px;"><strong>~11:30am</strong> Kiddush</p>
  <p style="margin:0 0 2px;"><strong>0:00pm</strong> Mincha / Third Meal / Maariv</p>
  <p style="margin:0 0 16px;"><strong>0:00pm</strong> Shabbat Ends</p>

  <div style="text-align:center;padding:14px;background:#eef6ee;border-radius:8px;border:1px solid #c3e0c3;margin-bottom:20px;">
    <p style="margin:0;color:#2d6a2d;font-style:italic;font-size:15px;">The Center City Eruv is UP!</p>
  </div>

  <h2 style="margin:0 0 12px;color:#2b5a81;font-size:20px;border-bottom:2px solid #dde4ef;padding-bottom:10px;">🍷 Kiddush This Week</h2>
  <p style="margin:0 0 16px;text-align:center;">[Kiddush sponsor information here]</p>

  <h2 style="margin:0 0 12px;color:#2b5a81;font-size:20px;border-bottom:2px solid #dde4ef;padding-bottom:10px;">📢 Announcements</h2>
  <p style="margin:0 0 16px;">[Community announcements here]</p>

</div>

<div style="padding:20px;background:linear-gradient(135deg,#2b5a81 0%,#1e3f5e 100%);border-radius:0 0 12px 12px;text-align:center;">
  <p style="margin:0 0 8px;color:#ffffff;font-size:15px;font-weight:700;">Support Mekor while buying wine and Judaica!</p>
  <p style="margin:0 0 12px;color:rgba(220,235,255,0.85);font-size:13px;">Mekor earns 5% back on every purchase.</p>
  <div>
    <a href="https://tinyurl.com/mekorwine" style="display:inline-block;padding:8px 20px;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:8px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;margin:0 6px;">🍷 Shop Wine</a>
    <a href="https://tinyurl.com/mekorjudaica" style="display:inline-block;padding:8px 20px;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:8px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;margin:0 6px;">✡️ Shop Judaica</a>
  </div>
  <p style="margin:14px 0 0;color:rgba(220,235,255,0.7);font-size:12px;">Mekor Habracha &middot; 1500 Walnut St Suite 206, Philadelphia, PA 19102 &middot; (215) 525-4246</p>
</div>

</div>`;

export default function NewTemplatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    subject: "",
    parshaName: "",
    shabbatDate: "",
    hebrewDate: "",
    candleLighting: "",
    bodyHtml: STARTER_HTML,
    status: "draft" as const,
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function save() {
    setSaving(true);
    const response = await fetch("/api/admin/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (response.ok) {
      router.push("/admin/templates");
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>New Newsletter Template</h1>
        <div className={styles.headerActions}>
          <AdminTabs current="templates" />
          <Link href="/admin/templates" className={styles.backLink}>← Back to templates</Link>
        </div>
      </header>

      <div className={styles.layout}>
        <div className={styles.formColumn}>
          <fieldset className={styles.fieldset}>
            <legend>Template Details</legend>
            <label className={styles.field}>
              <span>Title</span>
              <input type="text" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Parshat Beshalach - Jan 30-31" />
            </label>
            <label className={styles.field}>
              <span>Email Subject</span>
              <input type="text" value={form.subject} onChange={(e) => update("subject", e.target.value)} placeholder="e.g. Shabbat Newsletter - Parshat Beshalach" />
            </label>
            <div className={styles.fieldRow}>
              <label className={styles.field}>
                <span>Parsha Name</span>
                <input type="text" value={form.parshaName} onChange={(e) => update("parshaName", e.target.value)} placeholder="Beshalach" />
              </label>
              <label className={styles.field}>
                <span>Candle Lighting</span>
                <input type="text" value={form.candleLighting} onChange={(e) => update("candleLighting", e.target.value)} placeholder="4:59pm" />
              </label>
            </div>
            <div className={styles.fieldRow}>
              <label className={styles.field}>
                <span>Shabbat Date</span>
                <input type="text" value={form.shabbatDate} onChange={(e) => update("shabbatDate", e.target.value)} placeholder="January 30 - 31, 2026" />
              </label>
              <label className={styles.field}>
                <span>Hebrew Date</span>
                <input type="text" value={form.hebrewDate} onChange={(e) => update("hebrewDate", e.target.value)} placeholder="12 Shevat 5786" />
              </label>
            </div>
            <label className={styles.field}>
              <span>Status</span>
              <select value={form.status} onChange={(e) => update("status", e.target.value)}>
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
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

          <button type="button" className={styles.saveButton} onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Template"}
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
