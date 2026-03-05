"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import styles from "./page.module.css";

type PersonStatus = "lead" | "invited" | "visitor" | "member" | "admin" | "super_admin" | "inactive";

type PersonDetail = {
  id: number;
  userId: number | null;
  status: PersonStatus;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string;
  city: string;
  notes: string;
  source: string;
  tags: string[];
  invitedAt: string | null;
  joinedAt: string | null;
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
  role: "visitor" | "member" | "admin" | "super_admin" | null;
  preferences: {
    emailOptIn: boolean;
    smsOptIn: boolean;
    whatsappOptIn: boolean;
    doNotContact: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    preferredChannel: "email" | "sms" | "whatsapp";
  };
  dues: {
    outstandingBalanceCents: number;
    openCount: number;
  };
};

type TimelineEvent = {
  id: number;
  eventType: string;
  summary: string;
  payloadJson: Record<string, unknown>;
  occurredAt: string;
};

type PersonDelivery = {
  id: number;
  campaignId: number;
  channel: string;
  recipientEmail: string;
  status: string;
  provider: string;
  errorMessage: string;
  sentAt: string | null;
  createdAt: string;
  campaignName: string;
};

type PersonInvitation = {
  id: number;
  email: string;
  role: "visitor" | "member" | "admin" | "super_admin";
  status: "active" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  createdAt: string;
};

type PersonPayload = {
  person: PersonDetail;
  timeline: TimelineEvent[];
  invitations: PersonInvitation[];
  deliveries: PersonDelivery[];
};

const STATUS_OPTIONS: PersonStatus[] = ["lead", "invited", "visitor", "member", "admin", "super_admin", "inactive"];

export default function AdminPersonDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [data, setData] = useState<PersonPayload | null>(null);
  const [quickMessageSubject, setQuickMessageSubject] = useState("");
  const [quickMessageBody, setQuickMessageBody] = useState("");
  const [inviteRole, setInviteRole] = useState<"visitor" | "member" | "admin" | "super_admin">("member");

  const personId = useMemo(() => {
    const parsed = Number.parseInt(params?.id ?? "", 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [params?.id]);

  async function loadPerson() {
    if (!personId) return;
    const response = await fetch(`/api/admin/people/${personId}`);
    if (response.status === 401) {
      router.push(`/login?next=/admin/people/${personId}`);
      return;
    }
    const payload = (await response.json().catch(() => ({}))) as PersonPayload & { error?: string };
    if (!response.ok) {
      setError(payload.error || "Unable to load person");
      setLoading(false);
      return;
    }
    setData(payload);
    setLoading(false);
  }

  useEffect(() => {
    loadPerson().catch(() => {
      setError("Unable to load person");
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId]);

  async function savePerson() {
    if (!personId || !data) return;
    setWorking(true);
    setError("");
    setNotice("");
    const response = await fetch(`/api/admin/people/${personId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: data.person.status,
        firstName: data.person.firstName,
        lastName: data.person.lastName,
        displayName: data.person.displayName,
        email: data.person.email,
        phone: data.person.phone,
        city: data.person.city,
        notes: data.person.notes,
        source: data.person.source,
        tags: data.person.tags,
        preferences: data.person.preferences,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setWorking(false);
    if (!response.ok) {
      setError(payload.error || "Unable to save person");
      return;
    }
    setNotice("Person updated.");
    await loadPerson();
  }

  async function sendInvite() {
    if (!personId) return;
    setWorking(true);
    setError("");
    setNotice("");
    const response = await fetch(`/api/admin/people/${personId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: inviteRole }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setWorking(false);
    if (!response.ok) {
      setError(payload.error || "Unable to send invite");
      return;
    }
    setNotice("Invitation sent.");
    await loadPerson();
  }

  async function sendQuickMessage(mode: "preview" | "send") {
    if (!personId) return;
    setWorking(true);
    setError("");
    setNotice("");
    const response = await fetch(`/api/admin/people/${personId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        channel: "email",
        subject: quickMessageSubject,
        body: quickMessageBody,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; recipientCount?: number };
    setWorking(false);
    if (!response.ok) {
      setError(payload.error || "Unable to send message");
      return;
    }
    if (mode === "preview") {
      setNotice(`Preview ready. Recipients: ${payload.recipientCount ?? 0}`);
      return;
    }
    setNotice("Message sent.");
    await loadPerson();
  }

  function updatePerson(patch: Partial<PersonDetail>) {
    setData((prev) => (prev ? { ...prev, person: { ...prev.person, ...patch } } : prev));
  }

  function updatePreferences(patch: Partial<PersonDetail["preferences"]>) {
    setData((prev) =>
      prev
        ? {
            ...prev,
            person: {
              ...prev.person,
              preferences: {
                ...prev.person.preferences,
                ...patch,
              },
            },
          }
        : prev,
    );
  }

  if (!personId) {
    return <main className={styles.page}>Invalid person id.</main>;
  }

  if (loading) {
    return <main className={styles.page}>Loading person...</main>;
  }

  if (!data) {
    return <main className={styles.page}>{error || "Person not found"}</main>;
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>{data.person.displayName}</h1>
          <p>
            Status: <strong>{data.person.status}</strong> {data.person.userId ? `· user #${data.person.userId}` : "· no user account"}
          </p>
        </div>
        <div className={styles.links}>
          <Link href="/admin/people">Back to people</Link>
          <Link href="/admin/invitations">Invitations</Link>
          <Link href="/admin/messages">Messages</Link>
        </div>
      </header>

      {error ? <p className={styles.error}>{error}</p> : null}
      {notice ? <p className={styles.notice}>{notice}</p> : null}

      <section className={styles.grid}>
        <article className={styles.card}>
          <h2>Profile</h2>
          <div className={styles.formGrid}>
            <label>
              Status
              <select value={data.person.status} onChange={(event) => updatePerson({ status: event.target.value as PersonStatus })}>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              First name
              <input value={data.person.firstName} onChange={(event) => updatePerson({ firstName: event.target.value })} />
            </label>
            <label>
              Last name
              <input value={data.person.lastName} onChange={(event) => updatePerson({ lastName: event.target.value })} />
            </label>
            <label>
              Display name
              <input value={data.person.displayName} onChange={(event) => updatePerson({ displayName: event.target.value })} />
            </label>
            <label>
              Email
              <input type="email" value={data.person.email} onChange={(event) => updatePerson({ email: event.target.value })} />
            </label>
            <label>
              Phone
              <input value={data.person.phone} onChange={(event) => updatePerson({ phone: event.target.value })} />
            </label>
            <label>
              City
              <input value={data.person.city} onChange={(event) => updatePerson({ city: event.target.value })} />
            </label>
            <label>
              Source
              <input value={data.person.source} onChange={(event) => updatePerson({ source: event.target.value })} />
            </label>
            <label>
              Tags
              <input
                value={data.person.tags.join(", ")}
                onChange={(event) =>
                  updatePerson({
                    tags: event.target.value
                      .split(",")
                      .map((part) => part.trim())
                      .filter((part) => part.length > 0),
                  })
                }
              />
            </label>
            <label className={styles.fullWidth}>
              Notes
              <textarea value={data.person.notes} onChange={(event) => updatePerson({ notes: event.target.value })} rows={4} />
            </label>
          </div>
          <button type="button" onClick={savePerson} disabled={working}>
            {working ? "Saving..." : "Save person"}
          </button>
        </article>

        <article className={styles.card}>
          <h2>Communication Preferences</h2>
          <div className={styles.prefsGrid}>
            <label>
              <input
                type="checkbox"
                checked={data.person.preferences.emailOptIn}
                onChange={(event) => updatePreferences({ emailOptIn: event.target.checked })}
              />
              Email opt-in
            </label>
            <label>
              <input
                type="checkbox"
                checked={data.person.preferences.smsOptIn}
                onChange={(event) => updatePreferences({ smsOptIn: event.target.checked })}
              />
              SMS opt-in
            </label>
            <label>
              <input
                type="checkbox"
                checked={data.person.preferences.whatsappOptIn}
                onChange={(event) => updatePreferences({ whatsappOptIn: event.target.checked })}
              />
              WhatsApp opt-in
            </label>
            <label>
              <input
                type="checkbox"
                checked={data.person.preferences.doNotContact}
                onChange={(event) => updatePreferences({ doNotContact: event.target.checked })}
              />
              Do not contact
            </label>
            <label>
              Preferred channel
              <select
                value={data.person.preferences.preferredChannel}
                onChange={(event) =>
                  updatePreferences({
                    preferredChannel: event.target.value as "email" | "sms" | "whatsapp",
                  })
                }
              >
                <option value="email">email</option>
                <option value="sms">sms</option>
                <option value="whatsapp">whatsapp</option>
              </select>
            </label>
            <label>
              Quiet hours start
              <input
                placeholder="22:00"
                value={data.person.preferences.quietHoursStart}
                onChange={(event) => updatePreferences({ quietHoursStart: event.target.value })}
              />
            </label>
            <label>
              Quiet hours end
              <input
                placeholder="07:00"
                value={data.person.preferences.quietHoursEnd}
                onChange={(event) => updatePreferences({ quietHoursEnd: event.target.value })}
              />
            </label>
          </div>
          <p className={styles.meta}>
            Outstanding dues:{" "}
            {(data.person.dues.outstandingBalanceCents / 100).toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })}
          </p>
        </article>
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <h2>Invite</h2>
          <p>Send onboarding invite with preset role.</p>
          <div className={styles.row}>
            <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as typeof inviteRole)}>
              <option value="visitor">visitor</option>
              <option value="member">member</option>
              <option value="admin">admin</option>
              <option value="super_admin">super_admin</option>
            </select>
            <button type="button" onClick={sendInvite} disabled={working}>
              Send invite
            </button>
          </div>
          <ul className={styles.list}>
            {data.invitations.map((invitation) => (
              <li key={invitation.id}>
                #{invitation.id} · {invitation.role} · {invitation.status} · expires{" "}
                {new Date(invitation.expiresAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </article>

        <article className={styles.card}>
          <h2>Quick Send</h2>
          <label>
            Subject
            <input value={quickMessageSubject} onChange={(event) => setQuickMessageSubject(event.target.value)} />
          </label>
          <label>
            Body
            <textarea value={quickMessageBody} onChange={(event) => setQuickMessageBody(event.target.value)} rows={5} />
          </label>
          <div className={styles.row}>
            <button type="button" onClick={() => sendQuickMessage("preview")} disabled={working}>
              Preview
            </button>
            <button type="button" onClick={() => sendQuickMessage("send")} disabled={working}>
              Send
            </button>
          </div>
          <ul className={styles.list}>
            {data.deliveries.map((delivery) => (
              <li key={delivery.id}>
                {new Date(delivery.createdAt).toLocaleString()} · {delivery.status} · {delivery.campaignName}
                {delivery.errorMessage ? ` · ${delivery.errorMessage}` : ""}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className={styles.card}>
        <h2>Timeline</h2>
        <ul className={styles.list}>
          {data.timeline.map((item) => (
            <li key={item.id}>
              <strong>{item.eventType}</strong> · {new Date(item.occurredAt).toLocaleString()}
              {item.summary ? ` · ${item.summary}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
