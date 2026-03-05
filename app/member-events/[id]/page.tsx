"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { MemberShell } from "@/components/members/member-shell";
import memberShellStyles from "@/components/members/member-shell.module.css";
import styles from "./page.module.css";

type Attendee = {
  id: number;
  userId: number;
  status: "requested" | "approved" | "rejected" | "cancelled" | "waitlisted";
  requestedAt: string;
  respondedAt: string | null;
  displayName: string;
  avatarUrl: string;
  city: string;
};

type EventDetail = {
  event: {
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
    hostCity: string;
  };
  attendees: Attendee[];
  viewerAttendee: { id: number; status: Attendee["status"] } | null;
  canManage: boolean;
  comments: Array<{
    id: number;
    userId: number;
    body: string;
    createdAt: string;
    displayName: string;
    avatarUrl: string;
  }>;
  hostStats: {
    eventsHostedCount: number;
    approvedAttendeesTotal: number;
    uniqueAttendeesCount: number;
    upcomingHostedCount: number;
    attendanceRate: number;
  };
};

export default function MemberEventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [comment, setComment] = useState("");
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [attendeeStatusFilter, setAttendeeStatusFilter] = useState<"" | Attendee["status"]>("");
  const [detail, setDetail] = useState<EventDetail | null>(null);

  const eventId = useMemo(() => {
    const parsed = Number.parseInt(params?.id ?? "", 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [params?.id]);

  const fetchDetailData = useCallback(async (targetEventId: number) => {
    const response = await fetch(`/api/member-events/${targetEventId}`);
    const payload = (await response.json().catch(() => ({}))) as EventDetail & { error?: string };
    if (response.status === 403) {
      router.replace("/login?next=/events");
      return { redirected: true as const, detail: null as EventDetail | null, error: "" };
    }
    if (!response.ok) {
      return {
        redirected: false as const,
        detail: null as EventDetail | null,
        error: payload.error || "Unable to load event.",
      };
    }
    return {
      redirected: false as const,
      detail: payload,
      error: "",
    };
  }, [router]);

  async function loadDetail() {
    if (!eventId) return;
    const result = await fetchDetailData(eventId);
    if (result.redirected) return;
    if (result.error || !result.detail) {
      setError(result.error || "Unable to load event.");
      return;
    }
    setDetail(result.detail);
  }

  useEffect(() => {
    if (!eventId) return;

    let cancelled = false;
    void (async () => {
      const result = await fetchDetailData(eventId);
      if (cancelled || result.redirected) return;
      if (result.error || !result.detail) {
        setError(result.error || "Unable to load event.");
      } else {
        setDetail(result.detail);
      }
      setLoading(false);
    })().catch(() => {
      if (cancelled) return;
      setError("Unable to load event.");
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [eventId, fetchDetailData]);

  async function joinEvent() {
    if (!eventId) return;
    setWorking(true);
    setError("");
    setNotice("");
    const response = await fetch(`/api/member-events/${eventId}/join`, { method: "POST" });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      attendee?: { status: Attendee["status"] };
    };
    setWorking(false);
    if (response.status === 401) {
      window.location.assign(`/login?next=${encodeURIComponent(`/member-events/${eventId}`)}`);
      return;
    }
    if (!response.ok) {
      setError(payload.error || "Unable to join.");
      return;
    }
    setNotice(
      payload.attendee?.status === "requested"
        ? "Request sent to host."
        : payload.attendee?.status === "waitlisted"
          ? "You are waitlisted."
          : "You joined this event.",
    );
    await loadDetail();
  }

  async function moderateRequest(requestId: number, action: "approve" | "reject") {
    if (!eventId) return;
    setWorking(true);
    setError("");
    const response = await fetch(`/api/member-events/${eventId}/requests/${requestId}/${action}`, {
      method: "POST",
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setWorking(false);
    if (!response.ok) {
      setError(payload.error || `Unable to ${action} request.`);
      return;
    }
    await loadDetail();
  }

  async function cancelEvent() {
    if (!eventId) return;
    setWorking(true);
    setError("");
    const response = await fetch(`/api/member-events/${eventId}/cancel`, { method: "POST" });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setWorking(false);
    if (!response.ok) {
      setError(payload.error || "Unable to cancel event.");
      return;
    }
    setNotice("Event cancelled.");
    await loadDetail();
  }

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!eventId || !comment.trim()) return;
    setWorking(true);
    setError("");
    const response = await fetch(`/api/member-events/${eventId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: comment }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setWorking(false);
    if (!response.ok) {
      setError(payload.error || "Unable to post comment.");
      return;
    }
    setComment("");
    await loadDetail();
  }

  if (!eventId) {
    return <main className={`${styles.page} internal-page`}>Invalid event id.</main>;
  }

  if (loading) {
    return <main className={`${styles.page} internal-page`}>Loading event...</main>;
  }

  if (!detail) {
    return <main className={`${styles.page} internal-page`}>{error || "Event unavailable"}</main>;
  }

  const requestedAttendees = detail.attendees.filter((attendee) => attendee.status === "requested");
  const approvedCount = detail.attendees.filter((attendee) => attendee.status === "approved").length;
  const waitlistedCount = detail.attendees.filter((attendee) => attendee.status === "waitlisted").length;
  const filteredAttendees = detail.attendees.filter((attendee) => {
    if (attendeeStatusFilter && attendee.status !== attendeeStatusFilter) return false;
    if (!attendeeSearch.trim()) return true;

    return [attendee.displayName, attendee.city].join(" ").toLowerCase().includes(attendeeSearch.trim().toLowerCase());
  });

  const shellStats = [
    {
      label: "Approved",
      value: detail.event.capacity ? `${approvedCount}/${detail.event.capacity}` : String(approvedCount),
      hint: "Confirmed attendees",
    },
    {
      label: "Pending requests",
      value: String(requestedAttendees.length),
      hint: detail.canManage ? "Requires host action" : "Awaiting host review",
    },
    {
      label: "Comments",
      value: String(detail.comments.length),
      hint: `${waitlistedCount} waitlisted`,
    },
  ];

  return (
    <MemberShell
      title={detail.event.title}
      description={detail.event.description || "No description provided."}
      breadcrumbs={
        detail.canManage
          ? [
              { label: "Home", href: "/" },
              { label: "Members Area", href: "/members" },
              { label: "Host Events", href: "/account/member-events" },
              { label: detail.event.title },
            ]
          : [
              { label: "Home", href: "/" },
              { label: "Events", href: "/events" },
              { label: detail.event.title },
            ]
      }
      activeSection={detail.canManage ? "host-events" : "none"}
      stats={shellStats}
      actions={
        <>
          <Link href="/events" className={memberShellStyles.actionPill}>Events</Link>
          {detail.canManage ? (
            <Link href="/account/member-events" className={memberShellStyles.actionPill}>Manage hosted events</Link>
          ) : null}
        </>
      }
    >
      {detail.canManage ? (
        <section className={memberShellStyles.toolbar}>
          <div className={memberShellStyles.toolbarHeader}>
            <p className={memberShellStyles.toolbarTitle}>Attendee filters</p>
            <p className={memberShellStyles.toolbarMeta}>Search attendees by name or city, or isolate a specific attendance status.</p>
          </div>
          <div className={memberShellStyles.toolbarFields}>
            <label>
              Search attendees
              <input value={attendeeSearch} onChange={(event) => setAttendeeSearch(event.target.value)} placeholder="Search name or city" />
            </label>
            <label>
              Status
              <select
                value={attendeeStatusFilter}
                onChange={(event) => setAttendeeStatusFilter(event.target.value as "" | Attendee["status"])}
              >
                <option value="">All</option>
                <option value="requested">requested</option>
                <option value="approved">approved</option>
                <option value="waitlisted">waitlisted</option>
                <option value="rejected">rejected</option>
                <option value="cancelled">cancelled</option>
              </select>
            </label>
          </div>
          <div className={memberShellStyles.toolbarActions}>
            <button
              type="button"
              className={memberShellStyles.secondaryButton}
              onClick={() => {
                setAttendeeSearch("");
                setAttendeeStatusFilter("");
              }}
            >
              Clear filters
            </button>
          </div>
        </section>
      ) : null}

      <section className={`${styles.card} internal-card`}>
        <div className={styles.meta}>
          <span>{new Date(detail.event.startsAt).toLocaleString()}</span>
          <span>{detail.event.location || "Location TBD"}</span>
          <span>{detail.event.joinMode === "open_join" ? "Open join" : "Request to join"}</span>
          <span>{detail.event.visibility === "public" ? "Public" : "Members only"}</span>
          <span>Status: {detail.event.status}</span>
        </div>

        <p className={styles.host}>Hosted by {detail.event.hostDisplayName}</p>
        <p className={styles.counts}>
          Host stats: {detail.hostStats.eventsHostedCount} hosted · {detail.hostStats.approvedAttendeesTotal} approved attendees total · {detail.hostStats.upcomingHostedCount} upcoming
        </p>

        <div className={styles.actions}>
          {detail.viewerAttendee ? (
            <span className={styles.viewerStatus}>Your status: {detail.viewerAttendee.status}</span>
          ) : (
            <button type="button" onClick={joinEvent} disabled={working || detail.event.status !== "published"}>
              {working ? "Working..." : detail.event.joinMode === "open_join" ? "Join event" : "Request to join"}
            </button>
          )}
          {detail.canManage && detail.event.status !== "cancelled" ? (
            <button type="button" onClick={cancelEvent} disabled={working}>
              Cancel event
            </button>
          ) : null}
        </div>
      </section>

      {detail.canManage ? (
        <section className={`${styles.card} internal-card`}>
          <h2>Pending Join Requests</h2>
          {requestedAttendees.length === 0 ? (
            <p>No pending requests.</p>
          ) : (
            <ul className={styles.list}>
              {requestedAttendees.map((attendee) => (
                <li key={attendee.id}>
                  <strong>{attendee.displayName}</strong>
                  <p>Requested {new Date(attendee.requestedAt).toLocaleString()}</p>
                  <div className={styles.rowActions}>
                    <button type="button" onClick={() => moderateRequest(attendee.id, "approve")} disabled={working}>
                      Approve
                    </button>
                    <button type="button" onClick={() => moderateRequest(attendee.id, "reject")} disabled={working}>
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {detail.canManage ? (
        <section className={`${styles.card} internal-card`}>
          <h2>Attendee Directory</h2>
          <p>{filteredAttendees.length} attendee(s) visible in this view.</p>
          {filteredAttendees.length === 0 ? (
            <p>No attendees match the current filters.</p>
          ) : (
            <ul className={styles.list}>
              {filteredAttendees.map((attendee) => (
                <li key={attendee.id}>
                  <strong>{attendee.displayName}</strong>
                  <p>
                    {attendee.status} · {attendee.city || "City not provided"}
                  </p>
                  <small>
                    {attendee.respondedAt
                      ? `Updated ${new Date(attendee.respondedAt).toLocaleString()}`
                      : `Requested ${new Date(attendee.requestedAt).toLocaleString()}`}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className={`${styles.card} internal-card`}>
        <h2>Comments</h2>
        <form className={styles.commentForm} onSubmit={submitComment}>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={800}
            placeholder="Share a comment about this event..."
          />
          <button type="submit" disabled={working || !comment.trim()}>
            {working ? "Posting..." : "Post comment"}
          </button>
        </form>
        {detail.comments.length === 0 ? (
          <p>No comments yet.</p>
        ) : (
          <ul className={styles.list}>
            {detail.comments.map((item) => (
              <li key={item.id}>
                <strong>{item.displayName}</strong>
                <p>{item.body}</p>
                <small>{new Date(item.createdAt).toLocaleString()}</small>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? <p className={styles.error}>{error}</p> : null}
      {notice ? <p className={styles.notice}>{notice}</p> : null}
    </MemberShell>
  );
}
