import { NextResponse } from "next/server";
import { z } from "zod";

import { AskMekorServiceError, createAdminPrivateReply } from "@/lib/ask-mekor/service";
import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const replySchema = z.object({
  body: z.string().trim().min(1).max(8000),
});

function parseId(raw: string) {
  const id = Number.parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(request: Request, context: RouteContext) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const questionId = parseId((await context.params).id);
  if (!questionId) {
    return NextResponse.json({ error: "Invalid question id" }, { status: 400 });
  }

  const parsed = replySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await createAdminPrivateReply({
      actorUserId: adminResult.actor.id,
      questionId,
      body: parsed.data.body,
    });
    await writeAdminAuditLog({
      actorUserId: adminResult.actor.id,
      action: "ask_mekor_private_reply_sent",
      targetType: "ask_mekor_question",
      targetId: String(questionId),
      payload: {
        bodyLength: parsed.data.body.length,
      },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof AskMekorServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to send private reply" }, { status: 500 });
  }
}
