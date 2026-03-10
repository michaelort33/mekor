"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import styles from "./page.module.css";

type Campaign = {
  id: number;
  title: string;
  slug: string;
  description: string;
  designationLabel: string;
  targetAmountCents: number | null;
  suggestedAmountCents: number | null;
  status: "draft" | "active" | "closed" | "archived";
  shareablePath: string;
  launchedAt: string | null;
  updatedAt: string;
};

const initialForm = {
  title: "",
  description: "",
  designationLabel: "",
  targetAmountCents: "",
  suggestedAmountCents: "",
  status: "draft" as Campaign["status"],
};

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function fetchCampaigns() {
    const response = await fetch("/api/admin/campaigns").catch(() => null);
    if (!response) {
      return { campaigns: [] as Campaign[], error: "Unable to load campaigns" };
    }
    const payload = (await response.json().catch(() => ({}))) as { campaigns?: Campaign[]; error?: string };
    if (!response.ok) {
      return { campaigns: [] as Campaign[], error: payload.error || "Unable to load campaigns" };
    }
    return { campaigns: payload.campaigns ?? [], error: "" };
  }

  const loadCampaignsForEffect = useEffectEvent(async () => {
    const payload = await fetchCampaigns();
    if (payload.error) {
      setError(payload.error);
      return;
    }
    setCampaigns(payload.campaigns);
  });

  async function refreshCampaigns() {
    const payload = await fetchCampaigns();
    if (payload.error) {
      setError(payload.error);
      return;
    }
    setCampaigns(payload.campaigns);
  }

  useEffect(() => {
    void loadCampaignsForEffect();
  }, []);

  const stats = useMemo(
    () => [
      { label: "Campaigns", value: String(campaigns.length), hint: "Saved fundraising campaigns" },
      { label: "Active", value: String(campaigns.filter((item) => item.status === "active").length), hint: "Public donation destinations" },
      { label: "Drafts", value: String(campaigns.filter((item) => item.status === "draft").length), hint: "Not launched yet" },
    ],
    [campaigns],
  );

  async function createCampaign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    const response = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        designationLabel: form.designationLabel,
        targetAmountCents: form.targetAmountCents ? Number(form.targetAmountCents) : null,
        suggestedAmountCents: form.suggestedAmountCents ? Number(form.suggestedAmountCents) : null,
        status: form.status,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(payload.error || "Unable to create campaign");
      return;
    }
    setForm(initialForm);
    setNotice("Campaign saved.");
    await refreshCampaigns();
  }

  async function updateStatus(campaign: Campaign, status: Campaign["status"]) {
    const response = await fetch("/api/admin/campaigns", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        designationLabel: campaign.designationLabel,
        targetAmountCents: campaign.targetAmountCents,
        suggestedAmountCents: campaign.suggestedAmountCents,
        status,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error || "Unable to update campaign");
      return;
    }
    await refreshCampaigns();
  }

  return (
    <AdminShell
      currentPath="/admin/campaigns"
      title="Campaigns"
      description="Create campaigns in admin, launch them, and hand out shareable donation links that auto-attribute gifts."
      stats={stats}
    >
      <div className={styles.stack}>
        <section className={`${styles.card} internal-card`}>
          <h2>Create campaign</h2>
          <form onSubmit={createCampaign} className={styles.stack}>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span>Title</span>
                <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} required />
              </label>
              <label className={styles.field}>
                <span>Donation purpose label</span>
                <input
                  value={form.designationLabel}
                  onChange={(event) => setForm((prev) => ({ ...prev, designationLabel: event.target.value }))}
                  placeholder="Building fund, Kiddush, holiday appeal..."
                />
              </label>
              <label className={styles.field}>
                <span>Status</span>
                <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as Campaign["status"] }))}>
                  <option value="draft">draft</option>
                  <option value="active">active</option>
                  <option value="closed">closed</option>
                  <option value="archived">archived</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Target amount (cents)</span>
                <input value={form.targetAmountCents} onChange={(event) => setForm((prev) => ({ ...prev, targetAmountCents: event.target.value }))} />
              </label>
              <label className={styles.field}>
                <span>Suggested amount (cents)</span>
                <input value={form.suggestedAmountCents} onChange={(event) => setForm((prev) => ({ ...prev, suggestedAmountCents: event.target.value }))} />
              </label>
            </div>
            <label className={styles.field}>
              <span>Description</span>
              <textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
            </label>
            {error ? <p className={styles.error}>{error}</p> : null}
            {notice ? <p className={styles.notice}>{notice}</p> : null}
            <div className={styles.actions}>
              <button type="submit" className={styles.button} disabled={saving}>
                {saving ? "Saving..." : "Save campaign"}
              </button>
            </div>
          </form>
        </section>

        <section className={`${styles.card} internal-card`}>
          <h2>Saved campaigns</h2>
          <div className={styles.list}>
            {campaigns.map((campaign) => (
              <article key={campaign.id} className={styles.item}>
                <div>
                  <strong>{campaign.title}</strong>
                  <div className={styles.meta}>
                    <span>Status: {campaign.status}</span>
                    <span>Purpose: {campaign.designationLabel}</span>
                    <span>Updated: {new Date(campaign.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
                <p>{campaign.description || "No description yet."}</p>
                <a className={styles.link} href={campaign.shareablePath} target="_blank" rel="noreferrer noopener">
                  {campaign.shareablePath}
                </a>
                <div className={styles.actions}>
                  <button type="button" className={styles.button} onClick={() => updateStatus(campaign, "active")}>
                    Launch
                  </button>
                  <button type="button" className={styles.button} onClick={() => updateStatus(campaign, "closed")}>
                    Close
                  </button>
                </div>
              </article>
            ))}
            {campaigns.length === 0 ? <p>No campaigns yet.</p> : null}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
