import { NextResponse } from "next/server";
import { z } from "zod";

import { AskMekorServiceError, createAdminPublicReply } from "@/lib/ask-mekor/service";
import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";

const replySchema = z.object({
  questionId: z.number().int().min(1),
  body: z.string().trim().min(1).max(8000),
});

export async function POST(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const parsed = replySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const reply = await createAdminPublicReply({
      actorUserId: adminResult.actor.id,
      questionId: parsed.data.questionId,
      body: parsed.data.body,
    });
    await writeAdminAuditLog({
      actorUserId: adminResult.actor.id,
      action: "ask_mekor_public_reply_created",
      targetType: "ask_mekor_question",
      targetId: String(parsed.data.questionId),
      payload: {
        bodyLength: parsed.data.body.length,
      },
    });
    return NextResponse.json({ ok: true, reply }, { status: 201 });
  } catch (error) {
    if (error instanceof AskMekorServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to create reply" }, { status: 500 });
  }
}
