"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "./event-signup-panel.module.css";

type Tier = {
  id: number;
  name: string;
  priceCents: number;
  currency: string;
};

type SignupData = {
  event: {
    id: number;
    title: string;
    path: string;
    isClosed: boolean;
  };
  settings: {
    id: number;
    capacity: number | null;
    waitlistEnabled: boolean;
    paymentRequired: boolean;
    registrationDeadline: string | null;
  } | null;
  tiers: Tier[];
  userRegistration: {
    id: number;
    status: "registered" | "waitlisted" | "cancelled" | "payment_pending";
    ticketTierId: number | null;
    shareInFeed: boolean;
    signupComment: string;
  } | null;
  counts: {
    activeSpots: number;
    spotsRemaining: number | null;
    waitlisted: number;
  };
};

type FeedItem = {
  id: number;
  status: "registered" | "waitlisted" | "payment_pending";
  signupComment: string;
  registeredAt: string;
  displayName: string;
  avatarUrl: string;
  role: "visitor" | "member" | "admin" | "super_admin" | null;
  anonymous: boolean;
};

function toMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

type EventSignupPanelProps = {
  eventId: number | null;
  isClosed: boolean;
};

export function EventSignupPanel({ eventId, isClosed }: EventSignupPanelProps) {
  const [loading, setLoading] = useState(Boolean(eventId));
  const [feedLoading, setFeedLoading] = useState(Boolean(eventId));
  const [saving, setSaving] = useState(false);
  const [savingFeed, setSavingFeed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [signupData, setSignupData] = useState<SignupData | null>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [shareInFeed, setShareInFeed] = useState(false);
  const [signupComment, setSignupComment] = useState("");
  const [tierId, setTierId] = useState<number | null>(null);
  const [askSubject, setAskSubject] = useState("");
  const [askMessage, setAskMessage] = useState("");

  const selectedTier = useMemo(
    () => signupData?.tiers.find((tier) => tier.id === tierId) ?? null,
    [signupData?.tiers, tierId],
  );

  async function loadSignup() {
    if (!eventId) {
      setLoading(false);
      return;
    }

    const response = await fetch(`/api/events/${eventId}/signup`);
    const payload = (await response.json().catch(() => ({}))) as SignupData & { error?: string };

    if (response.status === 401) {
      setError("Please log in to register.");
      setSignupData(null);
      setLoading(false);
      return;
    }

    if (!response.ok) {
      setError(payload.error || "Unable to load registration details");
      setLoading(false);
      return;
    }

    setSignupData(payload);
    setShareInFeed(Boolean(payload.userRegistration?.shareInFeed));
    setSignupComment(payload.userRegistration?.signupComment ?? "");
    if (payload.tiers.length > 0) {
      setTierId(payload.tiers[0]?.id ?? null);
    }
    setLoading(false);
  }

  async function loadFeed() {
    if (!eventId) {
      setFeedLoading(false);
      return;
    }

    const response = await fetch(`/api/events/${eventId}/feed?limit=30`);
    const payload = (await response.json().catch(() => ({}))) as { items?: FeedItem[] };
    if (!response.ok) {
      setFeedItems([]);
      setFeedLoading(false);
      return;
    }

    setFeedItems(payload.items ?? []);
    setFeedLoading(false);
  }

  useEffect(() => {
    loadSignup().catch(() => {
      setError("Unable to load registration details");
      setLoading(false);
    });
    loadFeed().catch(() => {
      setFeedItems([]);
      setFeedLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function register() {
    if (!eventId || !signupData) return;

    setSaving(true);
    setError("");
    setNotice("");

    const response = await fetch(`/api/events/${eventId}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketTierId: tierId ?? undefined }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      checkoutRequired?: boolean;
      registration?: { id: number; status: "registered" | "waitlisted" | "cancelled" | "payment_pending" };
    };

    if (!response.ok || !payload.registration) {
      setError(payload.error || "Unable to register");
      setSaving(false);
      return;
    }

    setNotice(
      payload.registration.status === "waitlisted"
        ? "You are on the waitlist."
        : payload.registration.status === "registered"
          ? "You are registered."
          : "Registration created. Complete payment to confirm your spot.",
    );

    if (payload.checkoutRequired && payload.registration.status === "payment_pending") {
      const checkoutResponse = await fetch(`/api/events/${eventId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: payload.registration.id }),
      });

      const checkoutPayload = (await checkoutResponse.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!checkoutResponse.ok || !checkoutPayload.url) {
        setError(checkoutPayload.error || "Unable to start payment");
        setSaving(false);
        await loadSignup();
        return;
      }

      window.location.href = checkoutPayload.url;
      return;
    }

    await Promise.all([loadSignup(), loadFeed()]);
    setSaving(false);
  }

  async function cancelRegistration() {
    if (!eventId) return;

    setSaving(true);
    setError("");
    setNotice("");

    const response = await fetch(`/api/events/${eventId}/cancel`, {
      method: "POST",
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setError(payload.error || "Unable to cancel registration");
      setSaving(false);
      return;
    }

    setNotice("Registration cancelled.");
    setShareInFeed(false);
    setSignupComment("");
    await Promise.all([loadSignup(), loadFeed()]);
    setSaving(false);
  }

  async function askOrganizer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!eventId) return;

    setSaving(true);
    setError("");
    setNotice("");

    const response = await fetch(`/api/events/${eventId}/ask-organizer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: askSubject, message: askMessage }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setError(payload.error || "Unable to send message");
      setSaving(false);
      return;
    }

    setAskSubject("");
    setAskMessage("");
    setNotice("Message sent to organizer.");
    setSaving(false);
  }

  async function saveFeedSettings() {
    if (!eventId || !signupData?.userRegistration || signupData.userRegistration.status === "cancelled") {
      return;
    }

    setSavingFeed(true);
    setError("");
    setNotice("");

    const response = await fetch(`/api/events/${eventId}/feed`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shareInFeed, signupComment }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      registration?: {
        id: number;
        status: "registered" | "waitlisted" | "cancelled" | "payment_pending";
        shareInFeed: boolean;
        signupComment: string;
      };
    };

    if (!response.ok || !payload.registration) {
      setError(payload.error || "Unable to update feed settings");
      setSavingFeed(false);
      return;
    }

    const updatedRegistration = payload.registration;
    setShareInFeed(updatedRegistration.shareInFeed);
    setSignupComment(updatedRegistration.signupComment);
    setSignupData((prev) =>
      prev
        ? {
            ...prev,
            userRegistration: prev.userRegistration
              ? {
                  ...prev.userRegistration,
                  shareInFeed: updatedRegistration.shareInFeed,
                  signupComment: updatedRegistration.signupComment,
                }
              : prev.userRegistration,
          }
        : prev,
    );
    await loadFeed();
    setNotice(updatedRegistration.shareInFeed ? "Your RSVP is now in the party feed." : "Your RSVP is hidden from the feed.");
    setSavingFeed(false);
  }

  if (!eventId) {
    return (
      <section id="signup" className={styles.panel}>
        <h2>Registration</h2>
        <p>Registration is not configured for this event.</p>
      </section>
    );
  }

  return (
    <section id="signup" className={styles.panel}>
      <h2>Registration</h2>

      {loading ? <p>Loading registration options...</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      {notice ? <p className={styles.notice}>{notice}</p> : null}

      {!loading && error === "Please log in to register." ? (
        <p>
          <Link href="/login">Log in to sign up</Link>
        </p>
      ) : null}

      {!loading && signupData ? (
        <>
          <p>
            Spots filled: {signupData.counts.activeSpots}
            {signupData.counts.spotsRemaining !== null ? ` · Spots left: ${signupData.counts.spotsRemaining}` : ""}
            {signupData.counts.waitlisted > 0 ? ` · Waitlisted: ${signupData.counts.waitlisted}` : ""}
          </p>

          {signupData.userRegistration && signupData.userRegistration.status !== "cancelled" ? (
            <div className={styles.currentState}>
              <p>
                Current status: <strong>{signupData.userRegistration.status}</strong>
              </p>
              <button type="button" disabled={saving} onClick={cancelRegistration} className={styles.secondaryButton}>
                Cancel registration
              </button>

              <div className={styles.feedComposer}>
                <h3>Party feed post</h3>
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={shareInFeed}
                    onChange={(event) => setShareInFeed(event.target.checked)}
                  />
                  <span>Share my RSVP in this event feed</span>
                </label>
                <label className={styles.field}>
                  <span>Comment (optional)</span>
                  <textarea
                    value={signupComment}
                    onChange={(event) => setSignupComment(event.target.value)}
                    rows={3}
                    maxLength={280}
                    placeholder="Excited to come. Anyone else from Center City?"
                  />
                </label>
                <p className={styles.commentCount}>{signupComment.length}/280</p>
                <button
                  type="button"
                  disabled={savingFeed}
                  onClick={saveFeedSettings}
                  className={styles.primaryButton}
                >
                  {savingFeed ? "Saving..." : "Update feed post"}
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.registerBox}>
              {isClosed ? <p>Registration is closed for this event.</p> : null}
              {signupData.tiers.length > 0 ? (
                <label className={styles.field}>
                  <span>Ticket</span>
                  <select value={tierId ?? ""} onChange={(e) => setTierId(Number(e.target.value))}>
                    {signupData.tiers.map((tier) => (
                      <option key={tier.id} value={tier.id}>
                        {tier.name} ({toMoney(tier.priceCents, tier.currency)})
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {selectedTier ? <p>Selected: {selectedTier.name}</p> : null}
              <button type="button" disabled={saving || isClosed} onClick={register} className={styles.primaryButton}>
                {saving ? "Working..." : "Sign up"}
              </button>
            </div>
          )}

          <form className={styles.askForm} onSubmit={askOrganizer}>
            <h3>Ask organizer</h3>
            <label className={styles.field}>
              <span>Subject</span>
              <input
                value={askSubject}
                onChange={(event) => setAskSubject(event.target.value)}
                required
                minLength={1}
                maxLength={160}
              />
            </label>
            <label className={styles.field}>
              <span>Message</span>
              <textarea
                value={askMessage}
                onChange={(event) => setAskMessage(event.target.value)}
                rows={4}
                required
                minLength={1}
                maxLength={5000}
              />
            </label>
            <button type="submit" disabled={saving} className={styles.secondaryButton}>
              {saving ? "Sending..." : "Send"}
            </button>
          </form>

        </>
      ) : null}

      <section className={styles.feedSection}>
        <h3>Party feed</h3>
        <p className={styles.feedIntro}>See who is going and what people are saying.</p>
        {feedLoading ? <p>Loading feed...</p> : null}
        {!feedLoading && feedItems.length === 0 ? (
          <p className={styles.feedEmpty}>No one has shared an RSVP yet. Be the first.</p>
        ) : null}
        {!feedLoading && feedItems.length > 0 ? (
          <ul className={styles.feedList}>
            {feedItems.map((item) => (
              <li key={item.id} className={styles.feedItem}>
                {item.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.avatarUrl} alt={`${item.displayName} avatar`} className={styles.feedAvatar} />
                ) : (
                  <div className={styles.feedAvatarPlaceholder} aria-hidden="true">
                    {item.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={styles.feedBody}>
                  <p className={styles.feedMeta}>
                    <strong>{item.displayName}</strong> · {item.status} · {new Date(item.registeredAt).toLocaleString()}
                  </p>
                  {item.signupComment ? <p className={styles.feedComment}>{item.signupComment}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </section>
  );
}
