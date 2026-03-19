import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import { AskMekorServiceError, saveAskMekorSubcategory } from "@/lib/ask-mekor/service";

const subcategorySchema = z.object({
  categoryId: z.number().int().min(1),
  label: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(80).optional().default(""),
  description: z.string().trim().max(2000).optional().default(""),
  position: z.number().int().min(0).max(9999).optional().default(0),
});

export async function POST(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const parsed = subcategorySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const created = await saveAskMekorSubcategory(parsed.data);
    await writeAdminAuditLog({
      actorUserId: adminResult.actor.id,
      action: "ask_mekor_subcategory_created",
      targetType: "ask_mekor_subcategory",
      targetId: String(created.id),
      payload: parsed.data,
    });
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (error) {
    if (error instanceof AskMekorServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to create subcategory" }, { status: 500 });
  }
}
