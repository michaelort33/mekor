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

export default function AdminEventsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState<"" | Registration["status"]>("");
  const [settingStateFilter, setSettingStateFilter] = useState<"" | "enabled" | "disabled">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [settings, setSettings] = useState<SignupSetting[]>([]);
  const [registrationsPageInfo, setRegistrationsPageInfo] = useState<PageInfo | null>(null);

  const filteredSettings = useMemo(() => {
    const term = search.trim().toLowerCase();
    return settings.filter((setting) => {
      if (settingStateFilter === "enabled" && !setting.enabled) return false;
      if (settingStateFilter === "disabled" && setting.enabled) return false;
      if (!term) return true;
      return [setting.eventTitle, setting.organizerEmail, setting.eventPath].some((value) => value.toLowerCase().includes(term));
    });
  }, [search, settingStateFilter, settings]);

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
      { label: "Signup configs", value: String(settings.length), hint: `${enabledSettings} enabled` },
      { label: "Registrations", value: String(registrations.length), hint: `${registered} registered / ${waitlisted} waitlisted` },
      { label: "Filtered results", value: String(filteredRegistrations.length + filteredSettings.length), hint: "Visible on this page" },
    ];
  }, [filteredRegistrations.length, filteredSettings.length, registrations, settings]);

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
    setSettings(settingsPayload.settings ?? []);
    setLoading(false);
  }

  async function toggleEnabled(setting: SignupSetting) {
    const response = await fetch("/api/admin/events/signup-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId: setting.eventId,
        enabled: !setting.enabled,
        capacity: setting.capacity,
        waitlistEnabled: setting.waitlistEnabled,
        paymentRequired: setting.paymentRequired,
        registrationDeadline: setting.registrationDeadline,
        organizerEmail: setting.organizerEmail,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error || "Unable to update setting");
      return;
    }

    await load({ reset: true });
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
      description="Track signup configuration and registrations without leaving the admin area."
      stats={stats}
      actions={<Link href="/events" className={adminStyles.actionPill}>Open public events</Link>}
    >

      <section className={adminStyles.toolbar}>
        <div className={adminStyles.toolbarHeader}>
          <p className={adminStyles.toolbarTitle}>Event filters</p>
          <p className={adminStyles.toolbarMeta}>Search both configuration and registration lists from one bar.</p>
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
            <select value={settingStateFilter} onChange={(event) => setSettingStateFilter(event.target.value as "" | "enabled" | "disabled") }>
              <option value="">All</option>
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
                      <p>{setting.id ? "configured" : "not configured yet"}</p>
                    </div>
                    <button type="button" onClick={() => toggleEnabled(setting)}>
                      {setting.enabled ? "Disable" : "Enable"}
                    </button>
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
