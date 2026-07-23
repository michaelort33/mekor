"use client";

import Link from "next/link";
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

import styles from "./page.module.css";

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

function parseThreadParam(raw: string | null) {
  const id = Number.parseInt(raw ?? "", 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

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
  const deepLinkId = parseThreadParam(searchParams.get("thread"));

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | ThreadType>("");
  const [readFilter, setReadFilter] = useState<"all" | "unread">("all");
  const [selectedId, setSelectedId] = useState<number | null>(deepLinkId);
  const [mobilePane, setMobilePane] = useState<"list" | "detail">(deepLinkId ? "detail" : "list");
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

  // Honor ?thread= when Message (or a link) navigates here — including while already on inbox.
  useEffect(() => {
    if (deepLinkId == null) return;
    setSelectedId(deepLinkId);
    setMobilePane("detail");
  }, [deepLinkId]);

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
    // Don't clear selection while threads are still loading — that wiped ?thread= deep links.
    if (threadsResource.loading) return;

    if (deepLinkId != null) {
      if (threads.some((t) => t.threadId === deepLinkId)) {
        if (selectedId !== deepLinkId) {
          setSelectedId(deepLinkId);
        }
        return;
      }
      // Deep-link thread is gone after load; fall through to a safe default.
    }

    if (filtered.length === 0) {
      if (selectedId != null) {
        setSelectedId(null);
      }
      return;
    }

    if (selectedId == null || !filtered.some((t) => t.threadId === selectedId)) {
      setSelectedId(filtered[0].threadId);
    }
  }, [threadsResource.loading, threads, filtered, deepLinkId, selectedId]);

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

  function selectThread(threadId: number) {
    setSelectedId(threadId);
    setMobilePane("detail");
    if (deepLinkId !== threadId) {
      router.replace(`/account/inbox?thread=${threadId}`, { scroll: false });
    }
  }

  function showThreadList() {
    setMobilePane("list");
  }

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
      label: "Direct",
      value: String(threads.filter((t) => t.threadType === "direct").length),
      hint: "Member-to-member",
    },
  ];

  const deepLinkMissing =
    !threadsResource.loading && deepLinkId != null && !threads.some((t) => t.threadId === deepLinkId);

  return (
    <AccountShell
      currentPath="/account/inbox"
      title="Inbox"
      description="Message members from the directory, plus family invites and event requests."
      stats={stats}
      actions={
        <>
          <Link href="/members">
            <Button size="sm">Find members to message</Button>
          </Link>
          <Button size="sm" variant="ghost" onClick={() => void threadsResource.refresh()}>
            Refresh
          </Button>
        </>
      }
    >
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {deepLinkMissing ? (
        <Alert tone="danger">That conversation was not found or you no longer have access.</Alert>
      ) : null}

      <Toolbar>
        <ToolbarSearch value={search} onChange={setSearch} placeholder="Search subjects and messages…" />
        <ToolbarFilters>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as ThreadType | "")}>
            <option value="">All types</option>
            <option value="direct">Direct messages</option>
            <option value="family_invite">Family invite</option>
            <option value="family_chat">Family chat</option>
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
          <Link href="/members">
            <Button size="sm" variant="ghost">
              New message
            </Button>
          </Link>
        </ToolbarActions>
      </Toolbar>

      <div className={`${styles.layout} ${mobilePane === "detail" ? styles.mobileDetail : styles.mobileList}`}>
        <Card padded className={styles.listPane}>
          <CardHeader title="Threads" description={`${filtered.length} visible`} />
          <CardBody>
            {threadsResource.loading ? (
              <p className={styles.muted}>Loading…</p>
            ) : filtered.length === 0 ? (
              <EmptyState
                title={threads.length === 0 ? "No conversations yet" : "No matching threads"}
                description={
                  threads.length === 0
                    ? "Find a visible member in the directory, then tap Message to start a private conversation."
                    : "No threads match the current filters."
                }
                actions={
                  <Link href="/members">
                    <Button size="sm">Browse members</Button>
                  </Link>
                }
              />
            ) : (
              <ul className={styles.threadList}>
                {filtered.map((t) => {
                  const active = t.threadId === selectedId;
                  return (
                    <li key={t.threadId}>
                      <button
                        type="button"
                        onClick={() => selectThread(t.threadId)}
                        className={`${styles.threadButton} ${active ? styles.threadActive : ""}`}
                      >
                        <div className={styles.threadTop}>
                          <strong style={{ fontWeight: t.unread ? 700 : 500 }}>{t.subject || "Conversation"}</strong>
                          <Badge tone={THREAD_TONES[t.threadType]}>{t.threadType.replace("_", " ")}</Badge>
                        </div>
                        <span className={styles.threadPreview}>{t.latestMessage?.body || "No messages yet."}</span>
                        <span className={styles.threadMeta}>
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

        <Card padded className={styles.detailPane}>
          <CardHeader
            title={selectedThread ? selectedThread.subject || `Thread #${selectedThread.threadId}` : "Select a thread"}
            description={selectedThread?.familyName || undefined}
            actions={
              <Button size="sm" variant="ghost" className={styles.backButton} onClick={showThreadList}>
                Back to list
              </Button>
            }
          />
          <CardBody>
            {!selectedThread ? (
              <EmptyState title="No thread selected" description="Pick a thread to see messages." />
            ) : messagesResource.loading ? (
              <p className={styles.muted}>Loading messages…</p>
            ) : (
              <div className={styles.messages}>
                {messages.map((m) => {
                  const payload = getActionPayload(m.actionPayloadJson);
                  return (
                    <div
                      key={m.id}
                      className={`${styles.message} ${m.messageType === "system" ? styles.messageSystem : ""}`}
                    >
                      <div className={styles.messageMeta}>
                        <strong>{m.senderDisplayName || "System"}</strong>
                        <span>{new Date(m.createdAt).toLocaleString()}</span>
                      </div>
                      <p>{m.body}</p>
                      {payload ? (
                        <div className={styles.messageActions}>
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
                {messages.length === 0 ? <p className={styles.muted}>No messages in this thread yet.</p> : null}
              </div>
            )}

            {selectedThread ? (
              <form onSubmit={sendMessage} className={styles.compose}>
                <Textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Write a message…"
                  maxLength={4000}
                  rows={3}
                />
                <div className={styles.composeActions}>
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
