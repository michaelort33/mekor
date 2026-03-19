import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import { AskMekorServiceError, deleteAskMekorCategory, saveAskMekorCategory } from "@/lib/ask-mekor/service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const categorySchema = z.object({
  label: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(80).optional().default(""),
  description: z.string().trim().max(2000).optional().default(""),
  position: z.number().int().min(0).max(9999).optional().default(0),
});

function parseId(raw: string) {
  const id = Number.parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const id = parseId((await context.params).id);
  if (!id) {
    return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
  }

  const parsed = categorySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await saveAskMekorCategory({ id, ...parsed.data });
    await writeAdminAuditLog({
      actorUserId: adminResult.actor.id,
      action: "ask_mekor_category_updated",
      targetType: "ask_mekor_category",
      targetId: String(id),
      payload: parsed.data,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AskMekorServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to update category" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const id = parseId((await context.params).id);
  if (!id) {
    return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
  }

  try {
    await deleteAskMekorCategory(id);
    await writeAdminAuditLog({
      actorUserId: adminResult.actor.id,
      action: "ask_mekor_category_deleted",
      targetType: "ask_mekor_category",
      targetId: String(id),
      payload: {},
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AskMekorServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to delete category" }, { status: 500 });
  }
}
