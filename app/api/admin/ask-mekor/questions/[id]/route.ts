import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AskMekorServiceError,
  getAdminAskMekorQuestionDetail,
  updateAskMekorQuestionStatus,
} from "@/lib/ask-mekor/service";
import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const statusSchema = z.object({
  status: z.enum(["open", "answered", "closed"]),
});

function parseId(raw: string) {
  const id = Number.parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_: Request, context: RouteContext) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const questionId = parseId((await context.params).id);
  if (!questionId) {
    return NextResponse.json({ error: "Invalid question id" }, { status: 400 });
  }

  try {
    const detail = await getAdminAskMekorQuestionDetail(questionId);
    return NextResponse.json(detail);
  } catch (error) {
    if (error instanceof AskMekorServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to load Ask Mekor question detail" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const questionId = parseId((await context.params).id);
  if (!questionId) {
    return NextResponse.json({ error: "Invalid question id" }, { status: 400 });
  }

  const parsed = statusSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await updateAskMekorQuestionStatus({
      questionId,
      status: parsed.data.status,
    });
    await writeAdminAuditLog({
      actorUserId: adminResult.actor.id,
      action: "ask_mekor_question_status_updated",
      targetType: "ask_mekor_question",
      targetId: String(questionId),
      payload: {
        status: parsed.data.status,
      },
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    if (error instanceof AskMekorServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to update Ask Mekor question status" }, { status: 500 });
  }
}
