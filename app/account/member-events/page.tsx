"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { MemberShell } from "@/components/members/member-shell";
import memberShellStyles from "@/components/members/member-shell.module.css";
import styles from "./page.module.css";

type HostedEvent = {
  id: number;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  location: string;
  capacity: number | null;
  joinMode: "open_join" | "request_to_join";
  visibility: "members_only" | "public";
  status: "draft" | "published" | "cancelled" | "completed";
  counts: {
    approved: number;
    requested: number;
    waitlisted: number;
  };
};

type CreateEventForm = {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  location: string;
  capacity: string;
  joinMode: "open_join" | "request_to_join";
  visibility: "members_only" | "public";
  publishNow: boolean;
};

const initialForm: CreateEventForm = {
  title: "",
  description: "",
  startsAt: "",
  endsAt: "",
  location: "",
  capacity: "",
  joinMode: "open_join",
  visibility: "members_only",
  publishNow: true,
};

export default function AccountMemberEventsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [items, setItems] = useState<HostedEvent[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | HostedEvent["status"]>("");
  const [joinModeFilter, setJoinModeFilter] = useState<"" | HostedEvent["joinMode"]>("");
  const [form, setForm] = useState<CreateEventForm>(initialForm);

  const fetchHostedEventsData = useCallback(async () => {
    const response = await fetch("/api/member-events?host=me&includeDraft=1&includePast=1&limit=60");
    if (response.status === 401) {
      router.replace("/login?next=/account/member-events");
      return { redirected: true as const, items: [] as HostedEvent[], error: "" };
    }
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      items?: HostedEvent[];
    };
    if (!response.ok) {
      return {
        redirected: false as const,
        items: [] as HostedEvent[],
        error: payload.error || "Unable to load hosted events.",
      };
    }
    return {
      redirected: false as const,
      items: payload.items ?? [],
      error: "",
    };
  }, [router]);

  async function loadHostedEvents() {
    const result = await fetchHostedEventsData();
    if (result.redirected) return;
    if (result.error) {
      setError(result.error);
      return;
    }
    setItems(result.items);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchHostedEventsData();
      if (cancelled || result.redirected) return;
      if (result.error) {
        setError(result.error);
      } else {
        setItems(result.items);
      }
      setLoading(false);
    })().catch(() => {
      if (cancelled) return;
      setError("Unable to load hosted events.");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchHostedEventsData]);

  async function createEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setWorking(true);

    const response = await fetch("/api/member-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        location: form.location,
        capacity: form.capacity ? Number(form.capacity) : null,
        joinMode: form.joinMode,
        visibility: form.visibility,
        publishNow: form.publishNow,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setWorking(false);
    if (!response.ok) {
      setError(payload.error || "Unable to create event.");
      return;
    }

    setNotice("Member event created.");
    setForm(initialForm);
    await loadHostedEvents();
  }

  async function publishEvent(eventId: number) {
    setWorking(true);
    setError("");
    const response = await fetch(`/api/member-events/${eventId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setWorking(false);
    if (!response.ok) {
      setError(payload.error || "Unable to publish event.");
      return;
    }
    await loadHostedEvents();
  }

  async function cancelEvent(eventId: number) {
    setWorking(true);
    setError("");
    const response = await fetch(`/api/member-events/${eventId}/cancel`, {
      method: "POST",
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setWorking(false);
    if (!response.ok) {
      setError(payload.error || "Unable to cancel event.");
      return;
    }
    await loadHostedEvents();
  }

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false;
      if (joinModeFilter && item.joinMode !== joinModeFilter) return false;
      if (!query) return true;

      return [item.title, item.description, item.location].join(" ").toLowerCase().includes(query);
    });
  }, [items, joinModeFilter, search, statusFilter]);

  const shellStats = [
    {
      label: "Hosted events",
      value: String(items.length),
      hint: `${filteredItems.length} visible in current view`,
    },
    {
      label: "Published",
      value: String(items.filter((item) => item.status === "published").length),
      hint: "Live to members",
    },
    {
      label: "Open requests",
      value: String(items.reduce((sum, item) => sum + item.counts.requested, 0)),
      hint: "Pending host review",
    },
  ];

  return (
    <MemberShell
      title="Host a Member Event"
      description="Create gatherings for the community and keep approvals, draft status, and logistics in one workflow."
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Members Area", href: "/members" },
        { label: "Host Events" },
      ]}
      activeSection="host-events"
      stats={shellStats}
      actions={
        <>
          <Link href="/events" className={memberShellStyles.actionPill}>Public events</Link>
          <Link href="/account/inbox" className={memberShellStyles.actionPill}>Inbox</Link>
          <Link href="/account" className={memberShellStyles.actionPill}>Dashboard</Link>
        </>
      }
    >
      <section className={memberShellStyles.toolbar}>
        <div className={memberShellStyles.toolbarHeader}>
          <p className={memberShellStyles.toolbarTitle}>Hosted event filters</p>
          <p className={memberShellStyles.toolbarMeta}>Search by title or location, or narrow to a specific status and join mode.</p>
        </div>
        <div className={memberShellStyles.toolbarFields}>
          <label>
            Search
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search hosted events" />
          </label>
          <label>
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "" | HostedEvent["status"])}>
              <option value="">All</option>
              <option value="draft">draft</option>
              <option value="published">published</option>
              <option value="cancelled">cancelled</option>
              <option value="completed">completed</option>
            </select>
          </label>
          <label>
            Join mode
            <select value={joinModeFilter} onChange={(event) => setJoinModeFilter(event.target.value as "" | HostedEvent["joinMode"])}>
              <option value="">All</option>
              <option value="open_join">open join</option>
              <option value="request_to_join">request to join</option>
            </select>
          </label>
        </div>
        <div className={memberShellStyles.toolbarActions}>
          <button
            type="button"
            className={memberShellStyles.secondaryButton}
            onClick={() => {
              setSearch("");
              setStatusFilter("");
              setJoinModeFilter("");
            }}
          >
            Clear filters
          </button>
        </div>
      </section>

      <section className={`${styles.card} internal-card`}>
        <h1>Create a member event</h1>
        <p>Use the fields below to publish a new gathering and start collecting registrations.</p>

        <form className={styles.form} onSubmit={createEvent}>
          <label>
            Title
            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              required
              minLength={3}
              maxLength={160}
            />
          </label>

          <label>
            Description
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              maxLength={4000}
              rows={4}
            />
          </label>

          <div className={styles.row}>
            <label>
              Starts at
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))}
                required
              />
            </label>
            <label>
              Ends at
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(event) => setForm((prev) => ({ ...prev, endsAt: event.target.value }))}
              />
            </label>
          </div>

          <div className={styles.row}>
            <label>
              Location
              <input
                value={form.location}
                onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                maxLength={255}
              />
            </label>
            <label>
              Capacity
              <input
                type="number"
                min={1}
                max={2000}
                value={form.capacity}
                onChange={(event) => setForm((prev) => ({ ...prev, capacity: event.target.value }))}
                placeholder="Optional"
              />
            </label>
          </div>

          <div className={styles.row}>
            <label>
              Join mode
              <select
                value={form.joinMode}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    joinMode: event.target.value as CreateEventForm["joinMode"],
                  }))
                }
              >
                <option value="open_join">Open join</option>
                <option value="request_to_join">Request to join</option>
              </select>
            </label>
            <label>
              Visibility
              <select
                value={form.visibility}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    visibility: event.target.value as CreateEventForm["visibility"],
                  }))
                }
              >
                <option value="members_only">Members only</option>
                <option value="public">Public</option>
              </select>
            </label>
          </div>

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={form.publishNow}
              onChange={(event) => setForm((prev) => ({ ...prev, publishNow: event.target.checked }))}
            />
            Publish immediately
          </label>

          <button type="submit" disabled={working}>
            {working ? "Creating..." : "Create member event"}
          </button>
        </form>
      </section>

      <section className={`${styles.card} internal-card`}>
        <h2>Your hosted events</h2>
        <p>{filteredItems.length} event(s) visible with the current filters.</p>
        {loading ? <p>Loading events...</p> : null}
        {!loading && items.length === 0 ? <p>You have not hosted any events yet.</p> : null}
        {!loading && items.length > 0 && filteredItems.length === 0 ? <p>No hosted events match the current filters.</p> : null}
        <ul className={styles.list}>
          {filteredItems.map((event) => (
            <li key={event.id}>
              <div>
                <strong>{event.title}</strong>
                <p>
                  {new Date(event.startsAt).toLocaleString()} · {event.location || "Location TBD"} · {event.status}
                </p>
                <p>
                  Approved: {event.counts.approved} · Requested: {event.counts.requested} · Waitlisted: {event.counts.waitlisted}
                </p>
              </div>
              <div className={styles.itemActions}>
                <Link href={`/member-events/${event.id}`}>View / Manage</Link>
                {event.status === "draft" ? (
                  <button type="button" onClick={() => publishEvent(event.id)} disabled={working}>
                    Publish
                  </button>
                ) : null}
                {event.status !== "cancelled" ? (
                  <button type="button" onClick={() => cancelEvent(event.id)} disabled={working}>
                    Cancel
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {error ? <p className={styles.error}>{error}</p> : null}
      {notice ? <p className={styles.notice}>{notice}</p> : null}
    </MemberShell>
  );
}
