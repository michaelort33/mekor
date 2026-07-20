"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useMemo, useState, type FormEvent } from "react";

import { FeedbackFallbackForm } from "@/components/feedback/feedback-fallback-form";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  Message,
  MessageContent,
  MessageHeader,
} from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Textarea } from "@/components/ui/textarea";

const SESSION_STORAGE_KEY = "mekor.feedback.sessionPublicId";

type FeedbackChatPanelProps = {
  sourcePath: string;
};

function messageText(message: UIMessage) {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function readStoredSessionId() {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(SESSION_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function storeSessionId(value: string) {
  if (typeof window === "undefined" || !value) return;
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, value);
  } catch {
    // Ignore quota / private mode failures.
  }
}

export function FeedbackChatPanel({ sourcePath }: FeedbackChatPanelProps) {
  const [sessionPublicId, setSessionPublicId] = useState(readStoredSessionId);
  const [draft, setDraft] = useState("");
  const [useFallback, setUseFallback] = useState(false);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: "/api/feedback/chat",
        body: { sessionPublicId, sourcePath },
        fetch: async (input, init) => {
          const response = await fetch(input, init);
          const headerSession = response.headers.get("x-feedback-session-id");
          if (headerSession) {
            storeSessionId(headerSession);
            setSessionPublicId(headerSession);
          }
          if (!response.ok) {
            const payload = (await response.clone().json().catch(() => ({}))) as {
              code?: string;
              error?: string;
            };
            if (response.status >= 500 || payload.code === "AI_UNAVAILABLE") {
              setUseFallback(true);
            }
          }
          return response;
        },
      }),
    [sessionPublicId, sourcePath],
  );

  const { messages, sendMessage, status, error: chatError, stop } = useChat<UIMessage>({
    id: `site-feedback-${sourcePath}`,
    transport,
  });

  const busy = status === "submitted" || status === "streaming";

  async function onSend(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    await sendMessage({ text });
  }

  if (useFallback) {
    return (
      <FeedbackFallbackForm
        sourcePath={sourcePath}
        sessionPublicId={sessionPublicId}
        onSubmitted={() => setUseFallback(true)}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <MessageScrollerProvider autoScroll>
        <MessageScroller className="min-h-[18rem] flex-1 rounded-[24px] border border-[rgba(39,72,109,0.1)] bg-white/70" aria-live="polite">
          <MessageScrollerViewport className="px-3 py-4">
            <MessageScrollerContent className="gap-4">
              {messages.length === 0 ? (
                <div className="rounded-[22px] bg-[rgba(39,72,109,0.06)] px-4 py-4 text-sm leading-6 text-[var(--color-foreground)]">
                  <strong className="block font-[family-name:var(--font-heading)] text-xl tracking-[-0.02em]">
                    Hi friend — got an idea for Mekor?
                  </strong>
                  <span className="mt-2 block text-[var(--color-muted)]">
                    I collect suggestions and feedback with a smile. I don’t answer questions or look things up —
                    just share what would make the site or community experience kinder.
                  </span>
                </div>
              ) : (
                messages.map((message) => {
                  const isUser = message.role === "user";
                  const text = messageText(message);
                  return (
                    <MessageScrollerItem key={message.id} scrollAnchor={isUser}>
                      <Message align={isUser ? "end" : "start"}>
                        <MessageContent>
                          <MessageHeader className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
                            {isUser ? "You" : "Mekor listener"}
                          </MessageHeader>
                          <Bubble align={isUser ? "end" : "start"} variant={isUser ? "default" : "secondary"}>
                            <BubbleContent>{text || (message.role === "assistant" ? "…" : "")}</BubbleContent>
                          </Bubble>
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  );
                })
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      <form className="flex flex-col gap-2" onSubmit={onSend}>
        <Textarea
          name="feedback"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Share a suggestion, bug, or bit of praise…"
          aria-label="Share a suggestion or feedback"
          autoComplete="off"
          disabled={busy}
          rows={3}
          className="min-h-[5.5rem] resize-none rounded-[22px] border-[rgba(39,72,109,0.14)] bg-white/90"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs leading-5 text-[var(--color-muted)]" role={chatError ? "alert" : undefined}>
            {chatError
              ? chatError.message
              : "This chat collects feedback only — for questions try Ask Mekor or Contact Us."}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {busy ? (
              <Button type="button" variant="outline" size="sm" onClick={() => stop()}>
                Stop
              </Button>
            ) : null}
            <Button type="submit" size="sm" disabled={busy || !draft.trim()}>
              Send
            </Button>
          </div>
        </div>
        <button
          type="button"
          className="self-start text-xs font-medium text-[var(--color-muted)] underline-offset-2 hover:underline"
          onClick={() => setUseFallback(true)}
        >
          Prefer a short form instead?
        </button>
      </form>
    </div>
  );
}
