"use client";

import { useEffect, useState } from "react";

import adminStyles from "@/components/admin/admin-shell.module.css";
import styles from "./page.module.css";

type Subscriber = {
  id: number;
  displayName: string;
  email: string;
  topic: string;
  status: "pending" | "subscribed" | "unsubscribed" | "bounced" | "complained";
  source: string;
  confirmedAt: string | null;
  updatedAt: string;
};

type SubscribersPayload = {
  subscribers: Subscriber[];
  counts: Record<string, number>;
  topicCounts: Record<string, number>;
  uniquePeople: number;
};

export function SubscribersClient() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({});
  const [uniquePeople, setUniquePeople] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    if (topic) params.set("topic", topic);
    const response = await fetch(`/api/admin/newsletters/subscribers?${params}`);
    const payload = (await response.json()) as SubscribersPayload;
    if (response.ok) {
      setSubscribers(payload.subscribers);
      setCounts(payload.counts);
      setTopicCounts(payload.topicCounts);
      setUniquePeople(payload.uniquePeople);
    }
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/admin/newsletters/subscribers")
      .then(async (response) => ({ response, payload: (await response.json()) as SubscribersPayload }))
      .then(({ response, payload }) => {
        if (!active) return;
        if (response.ok) {
          setSubscribers(payload.subscribers);
          setCounts(payload.counts);
          setTopicCounts(payload.topicCounts);
          setUniquePeople(payload.uniquePeople);
        }
        setLoading(false);
      })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function update(id: number, nextStatus: "subscribed" | "unsubscribed") {
    const response = await fetch("/api/admin/newsletters/subscribers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: nextStatus }),
    });
    setNotice(response.ok ? `Subscriber marked ${nextStatus}.` : "Unable to update subscriber.");
    await load();
  }

  return (
    <div>
      <div className={adminStyles.statsGrid}>
        <article><span className={adminStyles.statLabel}>people</span><strong className={adminStyles.statValue}>{uniquePeople}</strong></article>
        {(["subscribed", "pending", "unsubscribed", "bounced", "complained"] as const).map((key) => (
          <article key={key}><span className={adminStyles.statLabel}>{key}</span><strong className={adminStyles.statValue}>{counts[key] ?? 0}</strong></article>
        ))}
      </div>
      <div className={adminStyles.statsGrid}>
        {Object.entries(topicCounts).sort(([left], [right]) => left.localeCompare(right)).map(([key, count]) => (
          <article key={key}><span className={adminStyles.statLabel}>{key}</span><strong className={adminStyles.statValue}>{count}</strong></article>
        ))}
      </div>
      <form className={adminStyles.toolbar} onSubmit={(event) => { event.preventDefault(); load(); }}>
        <div className={adminStyles.toolbarFields}>
          <label>Search<input type="search" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Name or email" /></label>
          <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="subscribed">Subscribed</option><option value="pending">Pending confirmation</option><option value="unsubscribed">Unsubscribed</option><option value="bounced">Bounced</option><option value="complained">Complained</option></select></label>
          <label>Topic<select value={topic} onChange={(event) => setTopic(event.target.value)}><option value="">All topics</option>{Object.keys(topicCounts).sort().map((key) => <option key={key} value={key}>{key}</option>)}</select></label>
        </div>
        <div className={adminStyles.toolbarActions}><button className={adminStyles.primaryButton} type="submit">Apply</button></div>
      </form>
      {notice ? <p role="status">{notice}</p> : null}
      {!loading ? <p>{subscribers.length.toLocaleString()} subscription rows shown.</p> : null}
      {loading ? <p>Loading subscribers…</p> : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Subscriber</th><th>Topic</th><th>Status</th><th>Source</th><th>Updated</th><th>Action</th></tr></thead>
            <tbody>{subscribers.map((subscriber) => (
              <tr key={subscriber.id}>
                <td><strong>{subscriber.displayName}</strong><br />{subscriber.email}</td>
                <td>{subscriber.topic}</td><td>{subscriber.status}</td><td>{subscriber.source}</td>
                <td>{new Date(subscriber.updatedAt).toLocaleString()}</td>
                <td>{subscriber.status === "subscribed" ? <button type="button" onClick={() => update(subscriber.id, "unsubscribed")}>Unsubscribe</button> : subscriber.status === "unsubscribed" || subscriber.status === "pending" ? <button type="button" onClick={() => update(subscriber.id, "subscribed")}>Subscribe</button> : "Delivery blocked"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
