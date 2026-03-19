"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { AskMekorQuestionDetail, AskMekorQuestionSummary, QuestionCategory } from "@/lib/ask-mekor/types";

type AdminListResponse = {
  categories: QuestionCategory[];
  items: AskMekorQuestionSummary[];
};

type AdminDetailResponse = AskMekorQuestionDetail;

export function AskMekorAdminConsole() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [visibility, setVisibility] = useState("");
  const [status, setStatus] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [categories, setCategories] = useState<QuestionCategory[]>([]);
  const [items, setItems] = useState<AskMekorQuestionSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AskMekorQuestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [savingReply, setSavingReply] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const stats = useMemo(() => {
    const publicCount = items.filter((item) => item.visibility === "public").length;
    const privateCount = items.filter((item) => item.visibility === "private").length;
    const openCount = items.filter((item) => item.status === "open").length;
    return { publicCount, privateCount, openCount };
  }, [items]);

  async function loadQuestions() {
    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (visibility) params.set("visibility", visibility);
    if (status) params.set("status", status);
    if (categorySlug) params.set("category", categorySlug);

    const response = await fetch(`/api/admin/ask-mekor/questions?${params.toString()}`);
    if (response.status === 401) {
      router.push("/login?next=/admin/ask-mekor");
      return;
    }
    const payload = (await response.json().catch(() => ({}))) as AdminListResponse & { error?: string };
    if (!response.ok) {
      setError(payload.error || "Unable to load Ask Mekor questions.");
      setLoading(false);
      return;
    }
    setCategories(payload.categories ?? []);
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

  useEffect(() => {
    void loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function loadDetail() {
      if (!selectedId) {
        setDetail(null);
        return;
      }
      setDetailLoading(true);
      const response = await fetch(`/api/admin/ask-mekor/questions/${selectedId}`);
      if (response.status === 401) {
        router.push("/login?next=/admin/ask-mekor");
        return;
      }
      const payload = (await response.json().catch(() => ({}))) as AdminDetailResponse & { error?: string };
      if (!response.ok) {
        setError(payload.error || "Unable to load question detail.");
        setDetailLoading(false);
        return;
      }
      setDetail(payload);
      setDetailLoading(false);
    }

    void loadDetail();
  }, [router, selectedId]);

  async function submitReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || !replyBody.trim()) return;

    setSavingReply(true);
    setError("");
    setNotice("");

    const url =
      detail.visibility === "public"
        ? "/api/ask-mekor/replies"
        : `/api/admin/ask-mekor/questions/${detail.id}/reply`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(detail.visibility === "public" ? { questionId: detail.id, body: replyBody } : { body: replyBody }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setSavingReply(false);

    if (!response.ok) {
      setError(payload.error || "Unable to send reply.");
      return;
    }

    setReplyBody("");
    setNotice(detail.visibility === "public" ? "Public answer posted." : "Private reply sent.");
    await loadQuestions();
    if (selectedId) {
      const detailResponse = await fetch(`/api/admin/ask-mekor/questions/${selectedId}`);
      const detailPayload = (await detailResponse.json().catch(() => ({}))) as AdminDetailResponse;
      if (detailResponse.ok) setDetail(detailPayload);
    }
  }

  async function changeStatus(nextStatus: "open" | "answered" | "closed") {
    if (!detail) return;

    setSavingStatus(true);
    setError("");
    setNotice("");

    const response = await fetch(`/api/admin/ask-mekor/questions/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setSavingStatus(false);

    if (!response.ok) {
      setError(payload.error || "Unable to update status.");
      return;
    }

    setNotice(`Marked as ${nextStatus}.`);
    await loadQuestions();
    if (selectedId) {
      const detailResponse = await fetch(`/api/admin/ask-mekor/questions/${selectedId}`);
      const detailPayload = (await detailResponse.json().catch(() => ({}))) as AdminDetailResponse;
      if (detailResponse.ok) setDetail(detailPayload);
    }
  }

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[24px] border border-[var(--color-border)] bg-white/82 px-5 py-4 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.28)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Loaded</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--color-foreground)]">{items.length}</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{stats.openCount} open</p>
        </article>
        <article className="rounded-[24px] border border-[var(--color-border)] bg-white/82 px-5 py-4 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.28)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Public</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--color-foreground)]">{stats.publicCount}</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Visible on the board</p>
        </article>
        <article className="rounded-[24px] border border-[var(--color-border)] bg-white/82 px-5 py-4 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.28)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Private</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--color-foreground)]">{stats.privateCount}</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Admin + asker only</p>
        </article>
      </div>

      <form
        className="grid gap-4 rounded-[28px] border border-[var(--color-border)] bg-white/82 p-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.28)] md:grid-cols-[minmax(0,1fr)_160px_160px_220px_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          void loadQuestions();
        }}
      >
        <input
          type="search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search title, asker, email, or details"
          className="h-12 rounded-[16px] border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-foreground)] outline-none"
        />
        <select
          value={visibility}
          onChange={(event) => setVisibility(event.target.value)}
          className="h-12 rounded-[16px] border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-foreground)] outline-none"
        >
          <option value="">All visibility</option>
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-12 rounded-[16px] border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-foreground)] outline-none"
        >
          <option value="">All status</option>
          <option value="open">Open</option>
          <option value="answered">Answered</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={categorySlug}
          onChange={(event) => setCategorySlug(event.target.value)}
          className="h-12 rounded-[16px] border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-foreground)] outline-none"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.label}
            </option>
          ))}
        </select>
        <button type="submit" className="h-12 rounded-[16px] bg-[var(--color-foreground)] px-5 text-sm font-semibold text-white">
          Apply
        </button>
      </form>

      {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}
      {notice ? <p className="text-sm font-medium text-emerald-700">{notice}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(340px,0.9fr)_minmax(0,1.4fr)]">
        <div className="overflow-hidden rounded-[30px] border border-[var(--color-border)] bg-white/88 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.28)]">
          <div className="border-b border-[var(--color-border)] px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
            Questions
          </div>
          {loading ? (
            <div className="px-5 py-8 text-sm text-[var(--color-muted)]">Loading questions...</div>
          ) : items.length === 0 ? (
            <div className="px-5 py-8 text-sm text-[var(--color-muted)]">No questions match these filters.</div>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.id} className="border-b border-[var(--color-border)] last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`block w-full px-5 py-4 text-left transition ${selectedId === item.id ? "bg-[var(--color-surface)]" : "hover:bg-[var(--color-surface)]"}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[var(--color-surface-strong)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                        {item.category.label}
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                        {item.visibility}
                      </span>
                    </div>
                    <h2 className="mt-3 text-base font-semibold text-[var(--color-foreground)]">{item.title}</h2>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      {item.askerName} · {item.replyCount} repl{item.replyCount === 1 ? "y" : "ies"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-[30px] border border-[var(--color-border)] bg-white/88 p-6 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.28)]">
          {detailLoading ? (
            <p className="text-sm text-[var(--color-muted)]">Loading question...</p>
          ) : !detail ? (
            <p className="text-sm text-[var(--color-muted)]">Select a question to review and answer it.</p>
          ) : (
            <div className="grid gap-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[var(--color-surface-strong)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                      {detail.category.label}
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">{detail.visibility}</span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">{detail.status}</span>
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold text-[var(--color-foreground)]">{detail.title}</h2>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    {detail.askerName} · {detail.askerEmail} {detail.askerPhone ? `· ${detail.askerPhone}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={savingStatus}
                    onClick={() => void changeStatus("open")}
                    className="rounded-[14px] border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-foreground)]"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    disabled={savingStatus}
                    onClick={() => void changeStatus("answered")}
                    className="rounded-[14px] border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-foreground)]"
                  >
                    Answered
                  </button>
                  <button
                    type="button"
                    disabled={savingStatus}
                    onClick={() => void changeStatus("closed")}
                    className="rounded-[14px] border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-foreground)]"
                  >
                    Closed
                  </button>
                </div>
              </div>

              <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Original question</p>
                <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--color-foreground)]">{detail.body}</div>
              </div>

              {detail.visibility === "public" ? (
                <div className="grid gap-3">
                  <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Public answers</h3>
                  {detail.replies.length === 0 ? (
                    <p className="text-sm text-[var(--color-muted)]">No public answers yet.</p>
                  ) : (
                    detail.replies.map((reply) => (
                      <article key={reply.id} className="rounded-[20px] border border-[var(--color-border)] bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-[var(--color-foreground)]">{reply.authorDisplayName}</p>
                          <p className="text-sm text-[var(--color-muted)]">
                            {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(reply.createdAt)}
                          </p>
                        </div>
                        <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--color-foreground)]">{reply.body}</div>
                      </article>
                    ))
                  )}
                </div>
              ) : (
                <div className="grid gap-3">
                  <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Private thread</h3>
                  {detail.threadMessages.length === 0 ? (
                    <p className="text-sm text-[var(--color-muted)]">No thread activity yet.</p>
                  ) : (
                    detail.threadMessages.map((message) => (
                      <article key={message.id} className="rounded-[20px] border border-[var(--color-border)] bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-[var(--color-foreground)]">{message.senderDisplayName || "System"}</p>
                          <p className="text-sm text-[var(--color-muted)]">
                            {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(message.createdAt)}
                          </p>
                        </div>
                        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">{message.messageType}</div>
                        <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--color-foreground)]">{message.body}</div>
                      </article>
                    ))
                  )}
                </div>
              )}

              <form onSubmit={submitReply} className="grid gap-3 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    {detail.visibility === "public" ? "Post public answer" : "Send private reply"}
                  </span>
                  <textarea
                    rows={6}
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                    className="rounded-[18px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-foreground)] outline-none"
                  />
                </label>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingReply}
                    className="rounded-[16px] bg-[var(--color-foreground)] px-5 py-3 text-sm font-semibold text-white"
                  >
                    {savingReply ? "Sending..." : detail.visibility === "public" ? "Post answer" : "Send reply"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
