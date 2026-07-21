"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getSuggestionKindLabel,
  getSuggestionStatusLabel,
  SITE_SUGGESTION_KINDS,
  SITE_SUGGESTION_STATUSES,
  type SiteSuggestionDetail,
  type SiteSuggestionKind,
  type SiteSuggestionStatus,
  type SiteSuggestionSummary,
} from "@/lib/feedback/types";

type ListResponse = {
  items: SiteSuggestionSummary[];
  pageInfo: { nextCursor: number | null; hasNextPage: boolean; limit: number };
};

function formatWhen(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export function FeedbackAdminConsole() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");
  const [items, setItems] = useState<SiteSuggestionSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<SiteSuggestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const stats = useMemo(() => {
    const open = items.filter((item) => item.status === "new").length;
    const reviewed = items.filter((item) => item.status === "reviewed").length;
    return { total: items.length, open, reviewed };
  }, [items]);

  async function loadList() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    if (kind) params.set("kind", kind);
    params.set("limit", "50");

    const response = await fetch(`/api/admin/feedback?${params.toString()}`);
    if (response.status === 401) {
      router.push("/login?next=/admin/feedback");
      return;
    }
    const payload = (await response.json().catch(() => ({}))) as ListResponse & { error?: string };
    if (!response.ok) {
      setError(payload.error || "Unable to load feedback.");
      setLoading(false);
      return;
    }
    setItems(payload.items ?? []);
    setLoading(false);
    if ((payload.items ?? []).length > 0) {
      setSelectedId((current) =>
        payload.items.some((item) => item.id === current) ? current : payload.items[0]?.id ?? null,
      );
    } else {
      setSelectedId(null);
      setDetail(null);
    }
  }

  async function loadDetail(id: number) {
    setDetailLoading(true);
    setError("");
    const response = await fetch(`/api/admin/feedback/${id}`);
    const payload = (await response.json().catch(() => ({}))) as {
      item?: SiteSuggestionDetail;
      error?: string;
    };
    if (!response.ok || !payload.item) {
      setError(payload.error || "Unable to load suggestion detail.");
      setDetailLoading(false);
      return;
    }
    setDetail({
      ...payload.item,
      createdAt: new Date(payload.item.createdAt),
      updatedAt: new Date(payload.item.updatedAt),
    });
    setAdminNotes(payload.item.adminNotes || "");
    setDetailLoading(false);
  }

  useEffect(() => {
    void loadList();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    void loadDetail(selectedId);
  }, [selectedId]);

  async function saveStatus(nextStatus: SiteSuggestionStatus) {
    if (!selectedId) return;
    setSaving(true);
    setError("");
    setNotice("");
    const response = await fetch(`/api/admin/feedback/${selectedId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: nextStatus, adminNotes }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      item?: SiteSuggestionSummary;
      error?: string;
    };
    setSaving(false);
    if (!response.ok || !payload.item) {
      setError(payload.error || "Unable to update status.");
      return;
    }
    setNotice(`Marked as ${getSuggestionStatusLabel(nextStatus)}.`);
    setItems((current) =>
      current.map((item) => (item.id === payload.item!.id ? { ...item, ...payload.item! } : item)),
    );
    setDetail((current) => (current ? { ...current, ...payload.item!, adminNotes } : current));
  }

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "end" }}>
        <label style={{ display: "grid", gap: "0.35rem", minWidth: "14rem", flex: 1 }}>
          <span>Search</span>
          <input
            name="feedbackSearch"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Title, body, contact…"
            autoComplete="off"
            style={{ height: "2.6rem", padding: "0 0.85rem" }}
          />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Status</span>
          <select
            name="feedbackStatus"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            style={{ height: "2.6rem" }}
          >
            <option value="">All</option>
            {SITE_SUGGESTION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {getSuggestionStatusLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Kind</span>
          <select
            name="feedbackKind"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            style={{ height: "2.6rem" }}
          >
            <option value="">All</option>
            {SITE_SUGGESTION_KINDS.map((value) => (
              <option key={value} value={value}>
                {getSuggestionKindLabel(value as SiteSuggestionKind)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => void loadList()} style={{ height: "2.6rem", padding: "0 1rem" }}>
          Refresh
        </button>
      </div>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <strong>{stats.total} shown</strong>
        <span>{stats.open} new</span>
        <span>{stats.reviewed} reviewed</span>
      </div>

      {error ? (
        <p style={{ color: "#a33b3b" }} role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p style={{ color: "#246b45" }} role="status">
          {notice}
        </p>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 28rem), 1fr))",
          gap: "1rem",
          alignItems: "start",
        }}
      >
        <div style={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: "1rem", overflowX: "auto" }}>
          {loading ? (
            <p style={{ padding: "1rem" }}>Loading…</p>
          ) : items.length === 0 ? (
            <p style={{ padding: "1rem" }}>No suggestions yet. The floating “Share an idea” widget will land here.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.92rem" }}>
              <thead>
                <tr style={{ textAlign: "left", background: "rgba(39,72,109,0.06)" }}>
                  <th style={{ padding: "0.75rem" }}>Created</th>
                  <th style={{ padding: "0.75rem" }}>Kind</th>
                  <th style={{ padding: "0.75rem" }}>Title</th>
                  <th style={{ padding: "0.75rem" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const active = item.id === selectedId;
                  return (
                    <tr
                      key={item.id}
                      style={{
                        background: active ? "rgba(47,111,168,0.12)" : "transparent",
                        borderTop: "1px solid rgba(15,23,42,0.06)",
                      }}
                    >
                      <td style={{ padding: "0.75rem", whiteSpace: "nowrap" }}>{formatWhen(item.createdAt)}</td>
                      <td style={{ padding: "0.75rem" }}>{getSuggestionKindLabel(item.kind)}</td>
                      <td style={{ padding: "0.75rem" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          aria-pressed={active}
                          style={{
                            border: 0,
                            padding: 0,
                            background: "transparent",
                            color: "inherit",
                            font: "inherit",
                            fontWeight: active ? 700 : 500,
                            textAlign: "left",
                            textDecoration: "underline",
                            textUnderlineOffset: "0.18em",
                            cursor: "pointer",
                          }}
                        >
                          {item.title}
                        </button>
                      </td>
                      <td style={{ padding: "0.75rem" }}>{getSuggestionStatusLabel(item.status)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: "1rem", padding: "1rem" }}>
          {detailLoading ? <p>Loading detail…</p> : null}
          {!detailLoading && !detail ? <p>Select a suggestion to review it.</p> : null}
          {detail ? (
            <div style={{ display: "grid", gap: "0.85rem" }}>
              <div>
                <h2 style={{ margin: 0 }}>{detail.title}</h2>
                <p style={{ margin: "0.35rem 0 0", opacity: 0.75 }}>
                  {getSuggestionKindLabel(detail.kind)} · {detail.priority} · {detail.sourcePath || "/"}
                </p>
              </div>
              <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{detail.body}</p>
              {detail.categoryDetail ? <p style={{ margin: 0 }}>Area: {detail.categoryDetail}</p> : null}
              <p style={{ margin: 0 }}>
                Contact: {detail.contactName || "—"} {detail.contactEmail ? `<${detail.contactEmail}>` : ""}
              </p>
              <label style={{ display: "grid", gap: "0.35rem" }}>
                <span>Admin notes</span>
                <textarea
                  name="adminNotes"
                  value={adminNotes}
                  onChange={(event) => setAdminNotes(event.target.value)}
                  rows={4}
                  style={{ width: "100%", padding: "0.75rem" }}
                />
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {SITE_SUGGESTION_STATUSES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    disabled={saving}
                    onClick={() => void saveStatus(value)}
                    style={{ padding: "0.55rem 0.9rem" }}
                  >
                    Mark {getSuggestionStatusLabel(value)}
                  </button>
                ))}
              </div>
              <div>
                <h3 style={{ margin: "0 0 0.5rem" }}>Conversation</h3>
                {detail.transcript.length === 0 ? (
                  <p style={{ margin: 0, opacity: 0.7 }}>No chat transcript saved for this session.</p>
                ) : (
                  <div style={{ display: "grid", gap: "0.5rem" }}>
                    {detail.transcript.map((message, index) => (
                      <div
                        key={`${message.role}-${index}`}
                        style={{
                          padding: "0.65rem 0.8rem",
                          borderRadius: "0.85rem",
                          background:
                            message.role === "user" ? "rgba(47,111,168,0.12)" : "rgba(15,23,42,0.05)",
                        }}
                      >
                        <strong style={{ display: "block", fontSize: "0.75rem", opacity: 0.7 }}>
                          {message.role === "user" ? "Visitor" : "Assistant"}
                        </strong>
                        <span style={{ whiteSpace: "pre-wrap" }}>{message.content}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
