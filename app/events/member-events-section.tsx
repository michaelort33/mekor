"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type MemberEventItem = {
  id: number;
  hostUserId: number;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  location: string;
  capacity: number | null;
  joinMode: "open_join" | "request_to_join";
  visibility: "members_only" | "public";
  status: "draft" | "published" | "cancelled" | "completed";
  hostDisplayName: string;
  hostAvatarUrl: string;
  hostRole: "visitor" | "member" | "admin" | "super_admin";
  counts: {
    approved: number;
    requested: number;
    waitlisted: number;
  };
  viewerStatus: "requested" | "approved" | "rejected" | "cancelled" | "waitlisted" | null;
  canManage: boolean;
};

export function MemberEventsSection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [items, setItems] = useState<MemberEventItem[]>([]);
  const [joiningEventId, setJoiningEventId] = useState<number>(0);

  async function fetchMemberEventsData() {
    const response = await fetch("/api/member-events?limit=24");
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      items?: MemberEventItem[];
    };
    if (!response.ok) {
      return {
        items: [] as MemberEventItem[],
        error: payload.error || "Unable to load member events.",
      };
    }
    return {
      items: payload.items ?? [],
      error: "",
    };
  }

  async function loadMemberEvents() {
    const result = await fetchMemberEventsData();
    if (result.error) {
      setError(result.error);
      return;
    }
    setItems(result.items);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchMemberEventsData();
      if (cancelled) return;
      if (result.error) {
        setError(result.error);
      } else {
        setItems(result.items);
      }
      setLoading(false);
    })().catch(() => {
      if (cancelled) return;
      setError("Unable to load member events.");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function joinEvent(eventId: number) {
    setNotice("");
    setError("");
    setJoiningEventId(eventId);

    const response = await fetch(`/api/member-events/${eventId}/join`, {
      method: "POST",
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      attendee?: { status: string };
    };
    setJoiningEventId(0);

    if (response.status === 401) {
      window.location.assign(`/login?next=${encodeURIComponent("/events")}`);
      return;
    }

    if (!response.ok) {
      setError(payload.error || "Unable to join this event.");
      return;
    }

    setNotice(
      payload.attendee?.status === "requested"
        ? "Join request sent to host."
        : payload.attendee?.status === "waitlisted"
          ? "Event is full. You were added to waitlist."
          : "You joined this event.",
    );
    await loadMemberEvents();
  }

  const hasUpcoming = useMemo(() => items.some((item) => item.status === "published"), [items]);

  return (
    <section className="member-events" aria-labelledby="member-events-heading">
      <header className="member-events__header">
        <div>
          <h2 id="member-events-heading">Member Events</h2>
          <p>Member-hosted gatherings, classes, and social events.</p>
        </div>
        <div className="member-events__header-actions">
          <Link href="/account/member-events" className="member-events__host-btn">
            Host an Event
          </Link>
          <Link href="/account/member-events" className="member-events__manage-btn">
            Manage Hosted Events
          </Link>
        </div>
      </header>

      {loading ? <p className="member-events__empty">Loading member events...</p> : null}
      {error ? <p className="member-events__error">{error}</p> : null}
      {notice ? <p className="member-events__notice">{notice}</p> : null}

      {!loading && !hasUpcoming ? (
        <p className="member-events__empty">No member events published yet.</p>
      ) : null}

      <div className="member-events__grid">
        {items
          .filter((item) => item.status === "published")
          .map((event) => (
            <article key={event.id} className="member-events__card">
              <div className="member-events__meta">
                <span>{new Date(event.startsAt).toLocaleString()}</span>
                <span>{event.visibility === "public" ? "Public" : "Members only"}</span>
                <span>{event.joinMode === "open_join" ? "Open join" : "Request to join"}</span>
              </div>
              <h3>{event.title}</h3>
              <p>{event.description || "No description provided."}</p>
              <p className="member-events__location">{event.location || "Location TBD"}</p>
              <div className="member-events__counts">
                <span>Approved: {event.counts.approved}</span>
                <span>Requested: {event.counts.requested}</span>
                <span>Waitlist: {event.counts.waitlisted}</span>
              </div>
              <p className="member-events__host">Hosted by {event.hostDisplayName}</p>

              <div className="member-events__actions">
                <Link href={`/member-events/${event.id}`} className="member-events__link-btn">
                  View details
                </Link>
                {event.viewerStatus ? (
                  <span className="member-events__status">Your status: {event.viewerStatus}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => joinEvent(event.id)}
                    disabled={joiningEventId === event.id}
                    className="member-events__join-btn"
                  >
                    {joiningEventId === event.id
                      ? "Joining..."
                      : event.joinMode === "open_join"
                        ? "Join event"
                        : "Request to join"}
                  </button>
                )}
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}
