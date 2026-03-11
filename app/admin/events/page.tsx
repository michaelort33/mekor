"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import adminStyles from "@/components/admin/admin-shell.module.css";
import styles from "./page.module.css";

type Registration = {
  id: number;
  eventId: number;
  eventTitle: string;
  userDisplayName: string;
  userEmail: string;
  status: "registered" | "waitlisted" | "cancelled" | "payment_pending";
  ticketTierName: string | null;
  registeredAt: string;
};

type SignupSetting = {
  id: number | null;
  eventId: number;
  eventTitle: string;
  eventPath: string;
  startAt: string | null;
  endAt: string | null;
  isPast: boolean;
  enabled: boolean;
  capacity: number | null;
  waitlistEnabled: boolean;
  paymentRequired: boolean;
  registrationDeadline: string | null;
  organizerEmail: string;
};

type PageInfo = {
  nextCursor: string | null;
  hasNextPage: boolean;
  limit: number;
};

type SignupSettingDraft = {
  enabled: boolean;
  capacity: string;
  waitlistEnabled: boolean;
  paymentRequired: boolean;
  registrationDeadline: string;
  organizerEmail: string;
};

function formatEventTiming(setting: SignupSetting) {
  const eventDate = setting.startAt ? new Date(setting.startAt) : null;
  if (!eventDate || Number.isNaN(eventDate.getTime())) {
    return "Date not set";
  }
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(eventDate);
}

function toLocalInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toCapacityOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }
  return parsed;
}

function buildSettingDraft(setting: SignupSetting): SignupSettingDraft {
  return {
    enabled: setting.enabled,
    capacity: setting.capacity === null ? "" : String(setting.capacity),
    waitlistEnabled: setting.waitlistEnabled,
    paymentRequired: setting.paymentRequired,
    registrationDeadline: toLocalInputValue(setting.registrationDeadline),
    organizerEmail: setting.organizerEmail,
  };
}

export default function AdminEventsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState<"" | Registration["status"]>("");
  const [settingStateFilter, setSettingStateFilter] = useState<"" | "enabled" | "disabled" | "past" | "upcoming">("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [settings, setSettings] = useState<SignupSetting[]>([]);
  const [registrationsPageInfo, setRegistrationsPageInfo] = useState<PageInfo | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [draft, setDraft] = useState<SignupSettingDraft | null>(null);

  const filteredSettings = useMemo(() => {
    const term = search.trim().toLowerCase();
    return settings.filter((setting) => {
      if (settingStateFilter === "enabled" && !setting.enabled) return false;
      if (settingStateFilter === "disabled" && setting.enabled) return false;
      if (settingStateFilter === "past" && !setting.isPast) return false;
      if (settingStateFilter === "upcoming" && setting.isPast) return false;
      if (!term) return true;
      return [setting.eventTitle, setting.organizerEmail, setting.eventPath].some((value) => value.toLowerCase().includes(term));
    });
  }, [search, settingStateFilter, settings]);

  const selectedSetting = useMemo(
    () => settings.find((setting) => setting.eventId === selectedEventId) ?? null,
    [selectedEventId, settings],
  );

  const upcomingSettings = useMemo(() => settings.filter((setting) => !setting.isPast), [settings]);
  const pastSettings = useMemo(() => settings.filter((setting) => setting.isPast), [settings]);

  const filteredRegistrations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return registrations.filter((registration) => {
      if (registrationStatusFilter && registration.status !== registrationStatusFilter) return false;
      if (!term) return true;
      return [registration.eventTitle, registration.userDisplayName, registration.userEmail, registration.ticketTierName ?? ""]
        .some((value) => value.toLowerCase().includes(term));
    });
  }, [registrationStatusFilter, registrations, search]);

  const stats = useMemo(() => {
    const enabledSettings = settings.filter((setting) => setting.enabled).length;
    const waitlisted = registrations.filter((registration) => registration.status === "waitlisted").length;
    const registered = registrations.filter((registration) => registration.status === "registered").length;
    return [
      { label: "Upcoming events", value: String(upcomingSettings.length), hint: `${pastSettings.length} past` },
      { label: "Signup configs", value: String(settings.length), hint: `${enabledSettings} enabled` },
      { label: "Registrations", value: String(registrations.length), hint: `${registered} registered / ${waitlisted} waitlisted` },
      { label: "Filtered results", value: String(filteredRegistrations.length + filteredSettings.length), hint: "Visible below" },
    ];
  }, [filteredRegistrations.length, filteredSettings.length, pastSettings.length, registrations, settings, upcomingSettings.length]);

  async function load(options?: { reset?: boolean; registrationsCursor?: string | null }) {
    setLoading(true);
    setError("");

    const registrationsParams = new URLSearchParams();
    registrationsParams.set("limit", "25");
    if (options?.registrationsCursor) {
      registrationsParams.set("cursor", options.registrationsCursor);
    }

    const [registrationsResponse, settingsResponse] = await Promise.all([
      fetch(`/api/admin/events/registrations?${registrationsParams.toString()}`),
      fetch("/api/admin/events/signup-settings"),
    ]);

    if (registrationsResponse.status === 401 || settingsResponse.status === 401) {
      router.push("/login?next=/admin/events");
      return;
    }

    const registrationsPayload = (await registrationsResponse.json().catch(() => ({}))) as {
      items?: Registration[];
      pageInfo?: PageInfo;
      error?: string;
    };
    const settingsPayload = (await settingsResponse.json().catch(() => ({}))) as {
      settings?: SignupSetting[];
      error?: string;
    };

    if (!registrationsResponse.ok || !settingsResponse.ok) {
      setError(registrationsPayload.error || settingsPayload.error || "Unable to load event admin data");
      setLoading(false);
      return;
    }

    setRegistrations((prev) =>
      options?.reset || !options?.registrationsCursor
        ? registrationsPayload.items ?? []
        : [...prev, ...(registrationsPayload.items ?? [])],
    );
    setRegistrationsPageInfo(registrationsPayload.pageInfo ?? null);
    const nextSettings = [...(settingsPayload.settings ?? [])].sort((left, right) => {
      if (left.isPast !== right.isPast) {
        return left.isPast ? 1 : -1;
      }

      const leftTime = left.startAt ? new Date(left.startAt).getTime() : Number.MAX_SAFE_INTEGER;
      const rightTime = right.startAt ? new Date(right.startAt).getTime() : Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime;
    });
    setSettings(nextSettings);

    if (nextSettings.length === 0) {
      setSelectedEventId(null);
      setDraft(null);
      setLoading(false);
      return;
    }

    const preserved = selectedEventId ? nextSettings.find((setting) => setting.eventId === selectedEventId) : null;
    const defaultSetting = nextSettings.find((setting) => !setting.isPast) ?? nextSettings[0];
    const active = preserved ?? defaultSetting;
    if (active) {
      setSelectedEventId(active.eventId);
      setDraft(buildSettingDraft(active));
    }
    setLoading(false);
  }

  async function saveSetting(setting: SignupSetting, nextDraft: SignupSettingDraft) {
    setSaving(true);
    setError("");
    const response = await fetch("/api/admin/events/signup-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: setting.eventId,
        enabled: nextDraft.enabled,
        capacity: toCapacityOrNull(nextDraft.capacity),
        waitlistEnabled: nextDraft.waitlistEnabled,
        paymentRequired: nextDraft.paymentRequired,
        registrationDeadline: toIsoOrNull(nextDraft.registrationDeadline),
        organizerEmail: nextDraft.organizerEmail.trim(),
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error || "Unable to update setting");
      setSaving(false);
      return;
    }

    await load({ reset: true }).catch(() => {
      setError("Saved, but unable to refresh event admin data");
    });
    setSaving(false);
  }

  async function toggleEnabled(setting: SignupSetting) {
    await saveSetting(setting, {
      enabled: !setting.enabled,
      capacity: setting.capacity === null ? "" : String(setting.capacity),
      waitlistEnabled: setting.waitlistEnabled,
      paymentRequired: setting.paymentRequired,
      registrationDeadline: toLocalInputValue(setting.registrationDeadline),
      organizerEmail: setting.organizerEmail,
    });
  }

  useEffect(() => {
    load({ reset: true }).catch(() => {
      setError("Unable to load event admin data");
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return (
    <AdminShell
      currentPath="/admin/events"
      title="Events Admin"
      description="Manage event signup settings and monitor attendee registrations from one place."
      stats={stats}
      actions={
        <>
          <Link href="/events" className={adminStyles.actionPill}>Open public events</Link>
          <Link href="/account/member-events" className={adminStyles.actionPill}>Member-hosted events</Link>
        </>
      }
    >

      <section className={adminStyles.toolbar}>
        <div className={adminStyles.toolbarHeader}>
          <p className={adminStyles.toolbarTitle}>Event filters</p>
          <p className={adminStyles.toolbarMeta}>Search both signup configuration and attendee registrations from one bar.</p>
        </div>
        <div className={adminStyles.toolbarFields}>
          <label>
            Search
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Event, organizer, person, email" />
          </label>
          <label>
            Registration status
            <select value={registrationStatusFilter} onChange={(event) => setRegistrationStatusFilter(event.target.value as "" | Registration["status"])}>
              <option value="">All</option>
              <option value="registered">registered</option>
              <option value="waitlisted">waitlisted</option>
              <option value="payment_pending">payment_pending</option>
              <option value="cancelled">cancelled</option>
            </select>
          </label>
          <label>
            Signup setting
            <select value={settingStateFilter} onChange={(event) => setSettingStateFilter(event.target.value as "" | "enabled" | "disabled" | "past" | "upcoming")}>
              <option value="">All</option>
              <option value="upcoming">upcoming</option>
              <option value="past">past</option>
              <option value="enabled">enabled</option>
              <option value="disabled">disabled</option>
            </select>
          </label>
        </div>
        <div className={adminStyles.toolbarActions}>
          <button type="button" className={adminStyles.secondaryButton} onClick={() => {
            setSearch("");
            setRegistrationStatusFilter("");
            setSettingStateFilter("");
          }}>
            Clear filters
          </button>
        </div>
      </section>

      {error ? <p className={styles.error}>{error}</p> : null}
      {loading ? <p>Loading event admin data...</p> : null}

      {!loading ? (
        <>
          <section className={`${styles.card} internal-card`}>
            <h2>Manage selected event</h2>

            {selectedSetting && draft ? (
              <div className={styles.manageLayout}>
                <div className={styles.manageHeader}>
                  <label className={styles.managePicker}>
                    Event
                    <select
                      value={String(selectedSetting.eventId)}
                      onChange={(event) => {
                        const nextEventId = Number(event.target.value);
                        const nextSetting = settings.find((setting) => setting.eventId === nextEventId);
                        if (!nextSetting) return;
                        setSelectedEventId(nextSetting.eventId);
                        setDraft(buildSettingDraft(nextSetting));
                      }}
                    >
                      {settings.map((setting) => (
                        <option key={setting.eventId} value={setting.eventId}>
                          {setting.eventTitle} {setting.isPast ? "(past)" : "(upcoming)"}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className={styles.manageMeta}>
                    <span className={`${styles.statusBadge} ${selectedSetting.isPast ? styles.statusBadgePast : styles.statusBadgeUpcoming}`}>
                      {selectedSetting.isPast ? "Past event" : "Upcoming event"}
                    </span>
                    <span>{formatEventTiming(selectedSetting)}</span>
                    <Link href={selectedSetting.eventPath} target="_blank" rel="noreferrer noopener">
                      Open event page
                    </Link>
                  </div>
                </div>

                <form
                  className={styles.manageForm}
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!selectedSetting || !draft || saving) return;
                    void saveSetting(selectedSetting, draft);
                  }}
                >
                  <label>
                    Signup enabled
                    <select
                      value={draft.enabled ? "enabled" : "disabled"}
                      onChange={(event) => setDraft((current) => (current ? { ...current, enabled: event.target.value === "enabled" } : current))}
                    >
                      <option value="enabled">enabled</option>
                      <option value="disabled">disabled</option>
                    </select>
                  </label>

                  <label>
                    Capacity (blank = unlimited)
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={draft.capacity}
                      onChange={(event) => setDraft((current) => (current ? { ...current, capacity: event.target.value } : current))}
                      placeholder="Unlimited"
                    />
                  </label>

                  <label>
                    Waitlist
                    <select
                      value={draft.waitlistEnabled ? "enabled" : "disabled"}
                      onChange={(event) => setDraft((current) => (current ? { ...current, waitlistEnabled: event.target.value === "enabled" } : current))}
                    >
                      <option value="enabled">enabled</option>
                      <option value="disabled">disabled</option>
                    </select>
                  </label>

                  <label>
                    Payment requirement
                    <select
                      value={draft.paymentRequired ? "required" : "not_required"}
                      onChange={(event) => setDraft((current) => (current ? { ...current, paymentRequired: event.target.value === "required" } : current))}
                    >
                      <option value="not_required">not required</option>
                      <option value="required">required</option>
                    </select>
                  </label>

                  <label>
                    Registration deadline
                    <input
                      type="datetime-local"
                      value={draft.registrationDeadline}
                      onChange={(event) => setDraft((current) => (current ? { ...current, registrationDeadline: event.target.value } : current))}
                    />
                  </label>

                  <label>
                    Organizer email
                    <input
                      type="email"
                      value={draft.organizerEmail}
                      onChange={(event) => setDraft((current) => (current ? { ...current, organizerEmail: event.target.value } : current))}
                      placeholder="admin@mekorhabracha.org"
                    />
                  </label>

                  <div className={styles.manageActions}>
                    <button type="submit" className={adminStyles.primaryButton} disabled={saving}>
                      {saving ? "Saving..." : "Save settings"}
                    </button>
                    <button
                      type="button"
                      className={adminStyles.secondaryButton}
                      onClick={() => setDraft(buildSettingDraft(selectedSetting))}
                      disabled={saving}
                    >
                      Reset changes
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <p>No events are available to manage right now.</p>
            )}
          </section>

          <section className={`${styles.card} internal-card`}>
            <h2>Signup settings</h2>
            {filteredSettings.length === 0 ? (
              <p>No settings configured.</p>
            ) : (
              <ul className={styles.list}>
                {filteredSettings.map((setting) => (
                  <li key={setting.eventId} className={styles.listItem}>
                    <div>
                      <strong>{setting.eventTitle}</strong>
                      <p>
                        {setting.enabled ? "enabled" : "disabled"} · capacity:{" "}
                        {setting.capacity === null ? "unlimited" : setting.capacity}
                      </p>
                      <p>
                        {setting.id ? "configured" : "not configured yet"} · {setting.isPast ? "past" : "upcoming"} · {formatEventTiming(setting)}
                      </p>
                    </div>
                    <div className={styles.listActions}>
                      <button type="button" onClick={() => {
                        setSelectedEventId(setting.eventId);
                        setDraft(buildSettingDraft(setting));
                      }}>
                        Manage
                      </button>
                      <button type="button" onClick={() => toggleEnabled(setting)}>
                        {setting.enabled ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={`${styles.card} internal-card`}>
            <h2>Registrations</h2>
            {filteredRegistrations.length === 0 ? (
              <p>No registrations yet.</p>
            ) : (
              <>
                <ul className={styles.list}>
                  {filteredRegistrations.map((registration) => (
                    <li key={registration.id} className={styles.listItem}>
                      <div>
                        <strong>{registration.eventTitle}</strong>
                        <p>
                          {registration.userDisplayName} ({registration.userEmail})
                        </p>
                        <p>
                          {registration.status}
                          {registration.ticketTierName ? ` · ${registration.ticketTierName}` : ""}
                        </p>
                      </div>
                      <div className={styles.listActions}>
                        <button
                          type="button"
                          onClick={() => {
                            const match = settings.find((setting) => setting.eventId === registration.eventId);
                            if (!match) return;
                            setSelectedEventId(match.eventId);
                            setDraft(buildSettingDraft(match));
                          }}
                        >
                          Manage event
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                {registrationsPageInfo?.hasNextPage && registrationsPageInfo.nextCursor ? (
                  <div className={styles.loadMoreWrap}>
                    <button type="button" onClick={() => load({ registrationsCursor: registrationsPageInfo.nextCursor })}>
                      Load more
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </section>
        </>
      ) : null}
    </AdminShell>
  );
}
