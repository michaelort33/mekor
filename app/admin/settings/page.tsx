"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import adminStyles from "@/components/admin/admin-shell.module.css";
import styles from "./page.module.css";

type Setting = {
  id: number;
  key: string;
  value: string;
  label: string;
  description: string;
  settingType: string;
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<Setting[]>([]);

  const filteredSettings = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return settings;
    return settings.filter((setting) =>
      [setting.label, setting.description, setting.key].some((value) => value.toLowerCase().includes(term)),
    );
  }, [search, settings]);

  const stats = useMemo(() => {
    const booleanCount = settings.filter((setting) => setting.settingType === "boolean");
    const enabledCount = booleanCount.filter((setting) => setting.value === "true").length;
    return [
      { label: "Settings", value: String(settings.length), hint: "Total configurable keys" },
      { label: "Boolean flags", value: String(booleanCount.length), hint: `${enabledCount} enabled` },
      { label: "Visible", value: String(filteredSettings.length), hint: "Matches current search" },
    ];
  }, [filteredSettings.length, settings]);

  async function loadSettings() {
    setLoading(true);
    setError("");

    const response = await fetch("/api/admin/settings");
    if (response.status === 401) {
      router.push("/login?next=/admin/settings");
      return;
    }

    if (response.status === 403) {
      setError("Super admin access required");
      setLoading(false);
      return;
    }

    const data = (await response.json().catch(() => ({}))) as { settings?: Setting[]; error?: string };
    if (!response.ok) {
      setError(data.error || "Unable to load settings");
      setLoading(false);
      return;
    }

    setSettings(data.settings ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadSettings().catch(() => {
      setError("Unable to load settings");
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveSetting(setting: Setting) {
    setError("");
    setSavingKey(setting.key);

    const response = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: setting.key,
        value: setting.value,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as { error?: string; setting?: Setting };
    if (!response.ok) {
      setError(data.error || "Unable to save setting");
      setSavingKey(null);
      return;
    }

    setSettings((prev) => prev.map((item) => (item.key === setting.key ? data.setting ?? item : item)));
    setSavingKey(null);
  }

  function updateLocalSetting(key: string, value: string) {
    setSettings((prev) => prev.map((setting) => (setting.key === key ? { ...setting, value } : setting)));
  }

  return (
    <AdminShell
      currentPath="/admin/settings"
      title="System Settings"
      description="Feature flags and system configuration. Super admin access only."
      stats={stats}
      actions={<Link href="/admin/users" className={adminStyles.actionPill}>Open users</Link>}
    >

      <section className={adminStyles.toolbar}>
        <div className={adminStyles.toolbarHeader}>
          <p className={adminStyles.toolbarTitle}>Find a setting</p>
          <p className={adminStyles.toolbarMeta}>Search by label, description, or underlying key.</p>
        </div>
        <div className={adminStyles.toolbarFields}>
          <label>
            Search
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Feature flag, billing, public directory" />
          </label>
        </div>
      </section>

      {error ? <p className={styles.error}>{error}</p> : null}

      {loading ? (
        <p>Loading settings...</p>
      ) : (
        <section className={styles.settingsList}>
          {filteredSettings.map((setting) => (
            <div key={setting.key} className={styles.settingItem}>
              <div className={styles.settingInfo}>
                <h3>{setting.label}</h3>
                <p className={styles.description}>{setting.description}</p>
                <code className={styles.key}>{setting.key}</code>
              </div>
              <div className={styles.settingControl}>
                {setting.settingType === "boolean" ? (
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={setting.value === "true"}
                      onChange={(e) => updateLocalSetting(setting.key, e.target.checked ? "true" : "false")}
                      disabled={savingKey === setting.key}
                    />
                    <span className={styles.toggleLabel}>{setting.value === "true" ? "Enabled" : "Disabled"}</span>
                  </label>
                ) : (
                  <input
                    type="text"
                    value={setting.value}
                    onChange={(e) => updateLocalSetting(setting.key, e.target.value)}
                    disabled={savingKey === setting.key}
                  />
                )}
                <button
                  type="button"
                  onClick={() => saveSetting(setting)}
                  disabled={savingKey === setting.key}
                  className={styles.saveButton}
                >
                  {savingKey === setting.key ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </AdminShell>
  );
}
