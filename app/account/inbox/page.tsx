"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AccountShell } from "@/components/account/account-shell";
import { Badge, type BadgeTone } from "@/components/backend/ui/badge";
import { Button } from "@/components/backend/ui/button";
import { Card, CardBody, CardHeader } from "@/components/backend/ui/card";
import { fetchJson, useResource } from "@/components/backend/data/use-resource";
import { Select, Textarea } from "@/components/backend/ui/field";
import { Alert, EmptyState } from "@/components/backend/ui/feedback";
import {
  FilterChip,
  Toolbar,
  ToolbarActions,
  ToolbarFilters,
  ToolbarSearch,
} from "@/components/backend/ui/toolbar";

type ThreadType = "family_invite" | "family_chat" | "direct" | "system";

type InboxThread = {
  threadId: number;
  threadType: ThreadType;
  subject: string;
  familyId: number | null;
  familyName: string;
  unread: boolean;
  latestMessage: { id: number; body: string; messageType: "text" | "system" | "action"; createdAt: string } | null;
  updatedAt: string;
};

type InboxMessage = {
  id: number;
  senderUserId: number | null;
  senderDisplayName: string | null;
  messageType: "text" | "system" | "action";
  body: string;
  actionPayloadJson: Record<string, unknown>;
  createdAt: string;
};

type InboxThreadsResponse = { items: InboxThread[] };
type ThreadMessagesResponse = {
  thread: { id: number; subject: string; type: ThreadType; familyName: string | null };
  messages: InboxMessage[];
};

type ThreadAction = { type: "accept" | "decline" | "revoke" | "approve" | "reject"; label: string };

type ThreadActionPayload =
  | { kind: "family_invite"; inviteId: number; actions: ThreadAction[] }
  | { kind: "member_event_request"; eventId: number; requestId: number; actions: ThreadAction[] };

const THREAD_TONES: Record<ThreadType, BadgeTone> = {
  family_invite: "info",
  family_chat: "success",
  direct: "neutral",
  system: "warning",
};

function getActionPayload(payload: Record<string, unknown>): ThreadActionPayload | null {
  const kind = payload.kind;
  if (kind !== "family_invite" && kind !== "member_event_request") return null;
  if (!Array.isArray(payload.actions)) return null;
  const actions: ThreadAction[] = payload.actions
    .map((a) => {
      if (!a || typeof a !== "object") return null;
      const v = a as Record<string, unknown>;
      if (
        (v.type === "accept" || v.type === "decline" || v.type === "revoke" || v.type === "approve" || v.type === "reject") &&
        typeof v.label === "string"
      ) {
        return { type: v.type, label: v.label };
      }
      return null;
    })
    .filter((v): v is ThreadAction => Boolean(v));
  if (actions.length === 0) return null;
  if (kind === "family_invite") {
    if (typeof payload.inviteId !== "number") return null;
    return { kind, inviteId: payload.inviteId, actions };
  }
  if (typeof payload.eventId !== "number" || typeof payload.requestId !== "number") return null;
  return { kind, eventId: payload.eventId, requestId: payload.requestId, actions };
}

export default function AccountInboxPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedId = Number.parseInt(searchParams.get("thread") ?? "", 10);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | ThreadType>("");
  const [readFilter, setReadFilter] = useState<"all" | "unread">("all");
  const [selectedId, setSelectedId] = useState<number | null>(Number.isInteger(requestedId) ? requestedId : null);
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);
  const [actionKey, setActionKey] = useState("");
  const [error, setError] = useState("");

  const threadsResource = useResource<InboxThreadsResponse>(
    (signal) => fetchJson<InboxThreadsResponse>("/api/inbox/threads", { signal }),
    [],
  );

  useEffect(() => {
    if (threadsResource.error?.includes("401")) {
      router.replace("/login?next=/account/inbox");
    }
  }, [threadsResource.error, router]);

  const threads = threadsResource.data?.items ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return threads.filter((t) => {
      if (typeFilter && t.threadType !== typeFilter) return false;
      if (readFilter === "unread" && !t.unread) return false;
      if (q) {
        return [t.subject, t.familyName, t.latestMessage?.body ?? ""].join(" ").toLowerCase().includes(q);
      }
      return true;
    });
  }, [threads, search, typeFilter, readFilter]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((t) => t.threadId === selectedId)) {
      setSelectedId(filtered[0].threadId);
    }
  }, [filtered, selectedId]);

  const messagesResource = useResource<ThreadMessagesResponse>(
    (signal) =>
      selectedId
        ? fetchJson<ThreadMessagesResponse>(`/api/inbox/threads/${selectedId}/messages`, { signal })
        : Promise.resolve({ thread: { id: 0, subject: "", type: "system", familyName: null }, messages: [] }),
    [selectedId],
    { skip: !selectedId },
  );

  const messages = messagesResource.data?.messages ?? [];
  const selectedThread = useMemo(() => threads.find((t) => t.threadId === selectedId) ?? null, [threads, selectedId]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !messageBody.trim()) return;
    setError("");
    setSending(true);
    try {
      await fetchJson(`/api/inbox/threads/${selectedId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: messageBody }),
      });
      setMessageBody("");
      await Promise.all([threadsResource.refresh(), messagesResource.refresh()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message");
    } finally {
      setSending(false);
    }
  }

  async function runAction(input: { action: ThreadAction["type"]; inviteId?: number; eventId?: number; requestId?: number }) {
    if (!selectedId) return;
    const key = `${selectedId}-${input.action}-${input.inviteId ?? 0}-${input.eventId ?? 0}-${input.requestId ?? 0}`;
    setActionKey(key);
    setError("");
    try {
      await fetchJson(`/api/inbox/threads/${selectedId}/actions`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      await Promise.all([threadsResource.refresh(), messagesResource.refresh()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run action");
    } finally {
      setActionKey("");
    }
  }

  const stats = [
    { label: "Visible", value: String(filtered.length), hint: `${threads.length} total` },
    { label: "Unread", value: String(threads.filter((t) => t.unread).length), hint: "Needs review" },
    {
      label: "Family",
      value: String(threads.filter((t) => t.threadType === "family_invite" || t.threadType === "family_chat").length),
      hint: "Invites + chat",
    },
  ];

  return (
    <AccountShell
      currentPath="/account/inbox"
      title="Inbox"
      description="Family invites, member event requests, and household chat in one queue."
      stats={stats}
    >
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <Toolbar>
        <ToolbarSearch value={search} onChange={setSearch} placeholder="Search subjects and messages…" />
        <ToolbarFilters>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as ThreadType | "")}>
            <option value="">All types</option>
            <option value="family_invite">Family invite</option>
            <option value="family_chat">Family chat</option>
            <option value="direct">Direct</option>
            <option value="system">System</option>
          </Select>
          <Select value={readFilter} onChange={(e) => setReadFilter(e.target.value as "all" | "unread")}>
            <option value="all">All</option>
            <option value="unread">Unread only</option>
          </Select>
          {(search || typeFilter || readFilter !== "all") ? (
            <FilterChip
              label="Clear filters"
              onRemove={() => {
                setSearch("");
                setTypeFilter("");
                setReadFilter("all");
              }}
            />
          ) : null}
        </ToolbarFilters>
        <ToolbarActions>
          <Button size="sm" variant="ghost" onClick={() => void threadsResource.refresh()}>
            Refresh
          </Button>
        </ToolbarActions>
      </Toolbar>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(260px, 320px) 1fr",
          gap: "var(--bk-space-4)",
          marginTop: "var(--bk-space-4)",
        }}
      >
        <Card padded>
          <CardHeader title="Threads" description={`${filtered.length} visible`} />
          <CardBody>
            {threadsResource.loading ? (
              <p style={{ color: "var(--bk-text-soft)" }}>Loading…</p>
            ) : filtered.length === 0 ? (
              <EmptyState title="No threads" description="No threads match the current filters." />
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--bk-space-2)" }}>
                {filtered.map((t) => {
                  const active = t.threadId === selectedId;
                  return (
                    <li key={t.threadId}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(t.threadId)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "var(--bk-space-2)",
                          background: active ? "var(--bk-surface-soft)" : "transparent",
                          border: active ? "1px solid var(--bk-border)" : "1px solid transparent",
                          borderRadius: "var(--bk-radius-md)",
                          cursor: "pointer",
                          display: "grid",
                          gap: 4,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <strong style={{ fontWeight: t.unread ? 700 : 500 }}>{t.subject || "Conversation"}</strong>
                          <Badge tone={THREAD_TONES[t.threadType]}>{t.threadType.replace("_", " ")}</Badge>
                        </div>
                        <span style={{ fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.latestMessage?.body || "No messages yet."}
                        </span>
                        <span style={{ fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)" }}>
                          {new Date(t.updatedAt).toLocaleString()}
                          {t.unread ? " · Unread" : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card padded>
          <CardHeader
            title={selectedThread ? selectedThread.subject || `Thread #${selectedThread.threadId}` : "Select a thread"}
            description={selectedThread?.familyName || undefined}
          />
          <CardBody>
            {!selectedThread ? (
              <EmptyState title="No thread selected" description="Pick a thread on the left to see messages." />
            ) : messagesResource.loading ? (
              <p style={{ color: "var(--bk-text-soft)" }}>Loading messages…</p>
            ) : (
              <div style={{ display: "grid", gap: "var(--bk-space-3)", maxHeight: 480, overflowY: "auto" }}>
                {messages.map((m) => {
                  const payload = getActionPayload(m.actionPayloadJson);
                  return (
                    <div
                      key={m.id}
                      style={{
                        padding: "var(--bk-space-3)",
                        borderRadius: "var(--bk-radius-md)",
                        background: m.messageType === "system" ? "var(--bk-surface-soft)" : "var(--bk-surface)",
                        border: "1px solid var(--bk-border)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "var(--bk-text-xs)",
                          color: "var(--bk-text-soft)",
                          marginBottom: 4,
                        }}
                      >
                        <strong>{m.senderDisplayName || "System"}</strong>
                        <span>{new Date(m.createdAt).toLocaleString()}</span>
                      </div>
                      <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{m.body}</p>
                      {payload ? (
                        <div style={{ display: "flex", gap: 8, marginTop: "var(--bk-space-2)" }}>
                          {payload.actions.map((action) => {
                            const key = `${selectedId}-${action.type}-${payload.kind === "family_invite" ? payload.inviteId : 0}-${payload.kind === "member_event_request" ? payload.eventId : 0}-${payload.kind === "member_event_request" ? payload.requestId : 0}`;
                            return (
                              <Button
                                key={`${m.id}-${action.type}`}
                                size="sm"
                                variant={action.type === "decline" || action.type === "reject" || action.type === "revoke" ? "secondary" : "primary"}
                                disabled={actionKey === key}
                                onClick={() =>
                                  runAction(
                                    payload.kind === "family_invite"
                                      ? { action: action.type, inviteId: payload.inviteId }
                                      : { action: action.type, eventId: payload.eventId, requestId: payload.requestId },
                                  )
                                }
                              >
                                {actionKey === key ? "Working…" : action.label}
                              </Button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {messages.length === 0 ? <p style={{ color: "var(--bk-text-soft)" }}>No messages in this thread yet.</p> : null}
              </div>
            )}

            {selectedThread ? (
              <form onSubmit={sendMessage} style={{ display: "grid", gap: "var(--bk-space-2)", marginTop: "var(--bk-space-3)" }}>
                <Textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Write a message…"
                  maxLength={4000}
                  rows={3}
                />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button type="submit" disabled={sending || !messageBody.trim()}>
                    {sending ? "Sending…" : "Send"}
                  </Button>
                </div>
              </form>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </AccountShell>
  );
}
