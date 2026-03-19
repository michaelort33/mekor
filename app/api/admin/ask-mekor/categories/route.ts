import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import { AskMekorServiceError, listAskMekorCategories, saveAskMekorCategory } from "@/lib/ask-mekor/service";

const categorySchema = z.object({
  label: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(80).optional().default(""),
  description: z.string().trim().max(2000).optional().default(""),
  position: z.number().int().min(0).max(9999).optional().default(0),
});

export async function GET() {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  try {
    const categories = await listAskMekorCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    if (error instanceof AskMekorServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to load Ask Mekor taxonomy" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const parsed = categorySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const created = await saveAskMekorCategory(parsed.data);
    await writeAdminAuditLog({
      actorUserId: adminResult.actor.id,
      action: "ask_mekor_category_created",
      targetType: "ask_mekor_category",
      targetId: String(created.id),
      payload: parsed.data,
    });
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (error) {
    if (error instanceof AskMekorServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to create category" }, { status: 500 });
  }
}
