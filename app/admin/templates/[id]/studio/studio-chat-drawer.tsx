"use client";

import type { UIMessage } from "ai";
import { getToolName, isToolUIPart } from "ai";
import { type FormEvent, type RefObject } from "react";

import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Tool, ToolContent, ToolHeader } from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

type StudioChatDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: UIMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  busy: boolean;
  statusText: string;
  onStop: () => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
};

function messageText(message: UIMessage) {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function toolParts(message: UIMessage) {
  return message.parts.filter(isToolUIPart);
}

function toolSummary(part: ReturnType<typeof toolParts>[number]) {
  if (!("state" in part) || part.state !== "output-available") return null;
  const output = "output" in part ? part.output : null;
  if (!output || typeof output !== "object") return null;
  const bodyHtml = (output as { bodyHtml?: unknown }).bodyHtml;
  if (typeof bodyHtml === "string" && bodyHtml.trim()) {
    return `Updated HTML (${bodyHtml.length.toLocaleString()} chars)`;
  }
  const summary = (output as { summary?: unknown }).summary;
  if (typeof summary === "string" && summary.trim()) return summary;
  return JSON.stringify(output).slice(0, 180);
}

export function StudioChatDrawer({
  open,
  onOpenChange,
  messages,
  draft,
  onDraftChange,
  onSubmit,
  busy,
  statusText,
  onStop,
  inputRef,
}: StudioChatDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-full max-w-[32rem] flex-col gap-0 p-0 sm:max-w-[32rem]">
        <SheetHeader className="border-b border-[var(--color-border)] px-5 py-4">
          <SheetTitle className="text-xl">Show it in Chat</SheetTitle>
          <SheetDescription>Ask for edits — the HTML and preview update live.</SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <ScrollArea className="h-full min-h-0 flex-1 px-5 py-4">
            {messages.length === 0 ? (
              <p className="m-0 text-sm leading-6 text-[var(--color-muted)]">
                Try “Make the intro warmer” or “Add candle lighting at 7:12pm.” The agent writes HTML
                directly into the editor.
              </p>
            ) : (
              <div className="grid gap-3">
                {messages.map((message) => {
                  const text = messageText(message);
                  const tools = toolParts(message);
                  return (
                    <Message key={message.id} from={message.role}>
                      <MessageContent>
                        <MessageResponse>
                          {text || (message.role === "assistant" && tools.length === 0 ? "…" : text)}
                        </MessageResponse>
                        {tools.map((part) => {
                          const state = "state" in part ? part.state : "input-streaming";
                          return (
                            <Tool key={"toolCallId" in part ? String(part.toolCallId) : getToolName(part)}>
                              <ToolHeader title={getToolName(part)} state={state} />
                              <ToolContent>{toolSummary(part)}</ToolContent>
                            </Tool>
                          );
                        })}
                      </MessageContent>
                    </Message>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <form className="grid gap-3 border-t border-[var(--color-border)] px-5 py-4" onSubmit={onSubmit}>
            <Textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              placeholder="Describe the change you want in the newsletter…"
              disabled={busy}
              className="min-h-24"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-[var(--color-muted)]">{statusText}</span>
              <div className="flex flex-wrap gap-2">
                {busy ? (
                  <Button type="button" variant="secondary" onClick={onStop}>
                    Stop
                  </Button>
                ) : null}
                <Button type="submit" disabled={busy || !draft.trim()}>
                  Apply in chat
                </Button>
              </div>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
