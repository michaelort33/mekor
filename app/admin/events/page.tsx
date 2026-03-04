"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  id: number;
  eventId: number;
  eventTitle: string;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [settings, setSettings] = useState<SignupSetting[]>([]);
  const [registrationsPageInfo, setRegistrationsPageInfo] = useState<PageInfo | null>(null);

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
      router.push("/admin/login");
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
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Events Admin</h1>
          <p>Manage registrations and signup settings.</p>
        </div>
        <div className={styles.links}>
          <Link href="/admin/settings">Settings</Link>
          <Link href="/admin/dues">Dues admin</Link>
          <Link href="/admin/users">Users admin</Link>
          <Link href="/admin/templates">Templates</Link>
        </div>
      </header>

      {error ? <p className={styles.error}>{error}</p> : null}
      {loading ? <p>Loading event admin data...</p> : null}

      {!loading ? (
        <>
          <section className={styles.card}>
            <h2>Signup settings</h2>
            {settings.length === 0 ? (
              <p>No settings configured.</p>
            ) : (
              <ul className={styles.list}>
                {settings.map((setting) => (
                  <li key={setting.id} className={styles.listItem}>
                    <div>
                      <strong>{setting.eventTitle}</strong>
                      <p>
                        {setting.enabled ? "enabled" : "disabled"} · capacity:{" "}
                        {setting.capacity === null ? "unlimited" : setting.capacity}
                      </p>
                    </div>
                    <button type="button" onClick={() => toggleEnabled(setting)}>
                      {setting.enabled ? "Disable" : "Enable"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.card}>
            <h2>Registrations</h2>
            {registrations.length === 0 ? (
              <p>No registrations yet.</p>
            ) : (
              <>
                <ul className={styles.list}>
                  {registrations.map((registration) => (
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
    </main>
  );
}
