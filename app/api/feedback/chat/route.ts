import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { NextResponse } from "next/server";

import { getUserSession } from "@/lib/auth/session";
import { createFeedbackChatModel } from "@/lib/feedback/chat-model";
import { createFeedbackChatTools } from "@/lib/feedback/chat-tools";
import {
  appendTranscript,
  createOrGetFeedbackSession,
} from "@/lib/feedback/service";
import { FEEDBACK_SYSTEM_PROMPT } from "@/lib/feedback/system-prompt";
import type { FeedbackTranscriptMessage } from "@/lib/feedback/types";
import { allowWithinWindow } from "@/lib/invitations/rate-limit";

export const maxDuration = 60;

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

function messageText(message: UIMessage) {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function toTranscript(messages: UIMessage[]): FeedbackTranscriptMessage[] {
  return messages
    .map((message) => {
      if (message.role !== "user" && message.role !== "assistant") return null;
      const content = messageText(message).slice(0, 4000);
      if (!content) return null;
      return { role: message.role, content } satisfies FeedbackTranscriptMessage;
    })
    .filter((message): message is FeedbackTranscriptMessage => Boolean(message));
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!allowWithinWindow(`feedback-chat:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many feedback chat requests. Please wait a moment." }, { status: 429 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? (body.messages as UIMessage[]) : null;
  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "messages are required." }, { status: 400 });
  }
  if (messages.length > 40) {
    return NextResponse.json({ error: "Too many messages in this conversation." }, { status: 400 });
  }

  for (const message of messages) {
    if (messageText(message).length > 4000) {
      return NextResponse.json({ error: "A message is too long." }, { status: 400 });
    }
  }

  const sourcePath =
    typeof body.sourcePath === "string" ? body.sourcePath.trim().slice(0, 512) : "";
  const sessionPublicId =
    typeof body.sessionPublicId === "string" ? body.sessionPublicId.trim().slice(0, 40) : "";

  const userSession = await getUserSession().catch(() => null);
  let session;
  try {
    session = await createOrGetFeedbackSession({
      publicId: sessionPublicId || null,
      sourcePath,
      userId: userSession?.userId ?? null,
      userAgent: request.headers.get("user-agent")?.slice(0, 512) || "",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  let model;
  try {
    model = createFeedbackChatModel();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat model is not configured.";
    return NextResponse.json({ error: message, code: "AI_UNAVAILABLE" }, { status: 500 });
  }

  const tools = createFeedbackChatTools({
    sessionId: session.id,
    sourcePath,
  });

  const result = streamText({
    model,
    system: FEEDBACK_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages, { tools }),
    tools,
    stopWhen: stepCountIs(6),
    temperature: 0.7,
    onEnd: async ({ text }) => {
      const transcript = toTranscript(messages);
      if (text.trim()) {
        transcript.push({ role: "assistant", content: text.trim().slice(0, 4000) });
      }
      try {
        await appendTranscript(session.id, transcript);
      } catch {
        // Best-effort transcript persistence — do not fail the stream.
      }
    },
  });

  const response = result.toUIMessageStreamResponse();
  response.headers.set("x-feedback-session-id", session.publicId);
  return response;
}
