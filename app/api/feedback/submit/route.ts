import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserSession } from "@/lib/auth/session";
import { saveSuggestionInputSchema } from "@/lib/feedback/save-suggestion-schema";
import {
  createOrGetFeedbackSession,
  saveSuggestionFromTool,
} from "@/lib/feedback/service";
import { allowWithinWindow } from "@/lib/invitations/rate-limit";

const submitSchema = saveSuggestionInputSchema.extend({
  sourcePath: z.string().trim().max(512).optional().default(""),
  sessionPublicId: z.string().trim().max(40).optional().default(""),
});

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!allowWithinWindow(`feedback-submit:${ip}`, 8, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
  }

  const parsed = submitSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const userSession = await getUserSession().catch(() => null);

  try {
    const session = await createOrGetFeedbackSession({
      publicId: parsed.data.sessionPublicId || null,
      sourcePath: parsed.data.sourcePath,
      userId: userSession?.userId ?? null,
      userAgent: request.headers.get("user-agent")?.slice(0, 512) || "",
    });

    const result = await saveSuggestionFromTool({
      sessionId: session.id,
      sourcePath: parsed.data.sourcePath,
      payload: {
        kind: parsed.data.kind,
        title: parsed.data.title,
        body: parsed.data.body,
        categoryDetail: parsed.data.categoryDetail,
        contactName: parsed.data.contactName,
        contactEmail: parsed.data.contactEmail,
        priority: parsed.data.priority,
      },
    });

    return NextResponse.json({
      ok: true,
      suggestionId: result.suggestionId,
      sessionPublicId: session.publicId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save suggestion.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
