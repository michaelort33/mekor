"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { MembersBreadcrumbs } from "@/components/members/members-breadcrumbs";
import styles from "./page.module.css";

type InboxThread = {
  threadId: number;
  threadType: "family_invite" | "family_chat" | "direct" | "system";
  subject: string;
  familyId: number | null;
  familyName: string;
  unread: boolean;
  latestMessage: {
    id: number;
    body: string;
    messageType: "text" | "system" | "action";
    createdAt: string;
  } | null;
  updatedAt: string;
};

type InboxThreadsResponse = {
  items: InboxThread[];
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

type ThreadMessagesResponse = {
  thread: {
    id: number;
    subject: string;
    type: "family_invite" | "family_chat" | "direct" | "system";
    familyName: string | null;
  };
  messages: InboxMessage[];
};

type ThreadAction = {
  type: "accept" | "decline" | "revoke" | "approve" | "reject";
  label: string;
};

type ThreadActionPayload =
  | {
      kind: "family_invite";
      inviteId: number;
      actions: ThreadAction[];
    }
  | {
      kind: "member_event_request";
      eventId: number;
      requestId: number;
      actions: ThreadAction[];
    };

function getThreadActionPayload(payload: Record<string, unknown>): ThreadActionPayload | null {
  const kind = payload.kind;
  const inviteId = payload.inviteId;
  const eventId = payload.eventId;
  const requestId = payload.requestId;
  const actions = payload.actions;
  if (kind !== "family_invite" && kind !== "member_event_request") return null;
  if (!Array.isArray(actions)) return null;

  const parsedActions: ThreadAction[] = actions
    .map((action) => {
      if (!action || typeof action !== "object") return null;
      const value = action as Record<string, unknown>;
      if (
        (value.type === "accept" ||
          value.type === "decline" ||
          value.type === "revoke" ||
          value.type === "approve" ||
          value.type === "reject") &&
        typeof value.label === "string"
      ) {
        return {
          type: value.type,
          label: value.label,
        };
      }
      return null;
    })
    .filter((value): value is ThreadAction => Boolean(value));

  if (parsedActions.length === 0) return null;

  if (kind === "family_invite") {
    if (typeof inviteId !== "number") return null;
    return {
      kind,
      inviteId,
      actions: parsedActions,
    };
  }

  if (typeof eventId !== "number" || typeof requestId !== "number") return null;
  return {
    kind,
    eventId,
    requestId,
    actions: parsedActions,
  };
}

export default function AccountInboxPage() {
  const router = useRouter();
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [threadTitle, setThreadTitle] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [runningAction, setRunningAction] = useState<string>("");

  async function loadThreads() {
    const response = await fetch("/api/inbox/threads");
    if (response.status === 401) {
      router.replace("/login?next=/account/inbox");
      return;
    }
    const payload = (await response.json().catch(() => ({}))) as InboxThreadsResponse & { error?: string };
    if (!response.ok) {
      setError(payload.error || "Unable to load inbox threads.");
      setLoadingThreads(false);
      return;
    }
    setThreads(payload.items);
    setLoadingThreads(false);
    if (payload.items.length > 0 && !selectedThreadId) {
      setSelectedThreadId(payload.items[0].threadId);
    }
    if (payload.items.length === 0) {
      setSelectedThreadId(null);
      setMessages([]);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      try {
        const response = await fetch("/api/inbox/threads");
        if (response.status === 401) {
          router.replace("/login?next=/account/inbox");
          return;
        }
        const payload = (await response.json().catch(() => ({}))) as InboxThreadsResponse & { error?: string };
        if (!response.ok) {
          if (!cancelled) {
            setError(payload.error || "Unable to load inbox threads.");
            setLoadingThreads(false);
          }
          return;
        }
        if (!cancelled) {
          setThreads(payload.items);
          setLoadingThreads(false);
          if (payload.items.length > 0) {
            setSelectedThreadId(payload.items[0].threadId);
          } else {
            setSelectedThreadId(null);
            setMessages([]);
          }
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load inbox threads.");
          setLoadingThreads(false);
        }
      }
    }

    void initialLoad();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    async function loadMessages() {
      if (!selectedThreadId) return;
      setLoadingMessages(true);
      const response = await fetch(`/api/inbox/threads/${selectedThreadId}/messages`);
      const payload = (await response.json().catch(() => ({}))) as ThreadMessagesResponse & { error?: string };
      if (!response.ok) {
        setError(payload.error || "Unable to load thread messages.");
        setLoadingMessages(false);
        return;
      }
      setThreadTitle(payload.thread.subject || `Thread #${payload.thread.id}`);
      setMessages(payload.messages);
      setLoadingMessages(false);
    }

    loadMessages().catch(() => {
      setError("Unable to load thread messages.");
      setLoadingMessages(false);
    });
  }, [selectedThreadId]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedThreadId || !messageBody.trim()) return;

    setSending(true);
    const response = await fetch(`/api/inbox/threads/${selectedThreadId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: messageBody }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error || "Unable to send message.");
      setSending(false);
      return;
    }
    setMessageBody("");
    setSending(false);
    await loadThreads();
    if (selectedThreadId) {
      const refreshed = await fetch(`/api/inbox/threads/${selectedThreadId}/messages`);
      const refreshedPayload = (await refreshed.json().catch(() => ({}))) as ThreadMessagesResponse;
      if (refreshed.ok) {
        setMessages(refreshedPayload.messages);
      }
    }
  }

  async function runThreadAction(input: {
    action: ThreadAction["type"];
    inviteId?: number;
    eventId?: number;
    requestId?: number;
  }) {
    if (!selectedThreadId) return;
    const actionKey = `${selectedThreadId}-${input.action}-${input.inviteId ?? 0}-${input.eventId ?? 0}-${input.requestId ?? 0}`;
    setRunningAction(actionKey);
    const response = await fetch(`/api/inbox/threads/${selectedThreadId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setRunningAction("");
    if (!response.ok) {
      setError(payload.error || "Unable to run action.");
      return;
    }
    await loadThreads();
    const refreshed = await fetch(`/api/inbox/threads/${selectedThreadId}/messages`);
    const refreshedPayload = (await refreshed.json().catch(() => ({}))) as ThreadMessagesResponse;
    if (refreshed.ok) {
      setMessages(refreshedPayload.messages);
    }
  }

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.threadId === selectedThreadId) ?? null,
    [threads, selectedThreadId],
  );

  return (
    <main className={styles.page}>
      <MembersBreadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Members Area", href: "/members" },
          { label: "Inbox" },
        ]}
        context="member"
        activeSection="inbox"
      />

      <header className={styles.header}>
        <div>
          <h1>Member Inbox</h1>
          <p>Manage family invites, member event requests, and household chat.</p>
        </div>
        <div className={styles.headerLinks}>
          <Link href="/account/family">Family management</Link>
          <Link href="/account">Account dashboard</Link>
        </div>
      </header>

      {error ? <p className={styles.error}>{error}</p> : null}

      <section className={styles.layout}>
        <aside className={styles.sidebar}>
          <h2>Threads</h2>
          {loadingThreads ? <p>Loading threads...</p> : null}
          {!loadingThreads && threads.length === 0 ? <p>No inbox threads yet.</p> : null}
          <ul className={styles.threadList}>
            {threads.map((thread) => (
              <li key={thread.threadId}>
                <button
                  type="button"
                  onClick={() => setSelectedThreadId(thread.threadId)}
                  className={thread.threadId === selectedThreadId ? styles.threadActive : ""}
                >
                  <strong>{thread.subject || "Conversation"}</strong>
                  <span>{thread.latestMessage?.body || "No messages yet."}</span>
                  <small>{new Date(thread.updatedAt).toLocaleString()}</small>
                  {thread.unread ? <em>Unread</em> : null}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <article className={styles.threadPane}>
          <h2>{selectedThread ? threadTitle || selectedThread.subject : "Select a thread"}</h2>
          {loadingMessages ? <p>Loading messages...</p> : null}

          <div className={styles.messages}>
            {messages.map((message) => {
              const actionPayload = getThreadActionPayload(message.actionPayloadJson);
              return (
                <div key={message.id} className={styles.message}>
                  <div className={styles.messageMeta}>
                    <strong>{message.senderDisplayName || "System"}</strong>
                    <span>{new Date(message.createdAt).toLocaleString()}</span>
                  </div>
                  <p>{message.body}</p>
                  {actionPayload ? (
                    <div className={styles.messageActions}>
                      {actionPayload.actions.map((action) => (
                        <button
                          key={`${message.id}-${action.type}`}
                          type="button"
                          onClick={() =>
                            runThreadAction(
                              actionPayload.kind === "family_invite"
                                ? {
                                    action: action.type,
                                    inviteId: actionPayload.inviteId,
                                  }
                                : {
                                    action: action.type,
                                    eventId: actionPayload.eventId,
                                    requestId: actionPayload.requestId,
                                  },
                            )
                          }
                          disabled={
                            runningAction ===
                            `${selectedThreadId}-${action.type}-${actionPayload.kind === "family_invite" ? actionPayload.inviteId : 0}-${actionPayload.kind === "member_event_request" ? actionPayload.eventId : 0}-${actionPayload.kind === "member_event_request" ? actionPayload.requestId : 0}`
                          }
                        >
                          {runningAction ===
                          `${selectedThreadId}-${action.type}-${actionPayload.kind === "family_invite" ? actionPayload.inviteId : 0}-${actionPayload.kind === "member_event_request" ? actionPayload.eventId : 0}-${actionPayload.kind === "member_event_request" ? actionPayload.requestId : 0}`
                            ? "Working..."
                            : action.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {selectedThread && messages.length === 0 && !loadingMessages ? <p>No messages in this thread yet.</p> : null}
          </div>

          {selectedThread ? (
            <form className={styles.compose} onSubmit={sendMessage}>
              <textarea
                value={messageBody}
                onChange={(event) => setMessageBody(event.target.value)}
                placeholder="Write a message..."
                maxLength={4000}
              />
              <button type="submit" disabled={sending || !messageBody.trim()}>
                {sending ? "Sending..." : "Send"}
              </button>
            </form>
          ) : null}
        </article>
      </section>
    </main>
  );
}
