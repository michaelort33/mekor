import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";
import { getSuggestionDetail, updateSuggestionStatus } from "@/lib/feedback/service";
import { SITE_SUGGESTION_STATUSES } from "@/lib/feedback/types";

const patchSchema = z.object({
  status: z.enum(SITE_SUGGESTION_STATUSES),
  adminNotes: z.string().trim().max(5000).optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const { id: rawId } = await context.params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const detail = await getSuggestionDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ item: detail });
}

export async function PATCH(request: Request, context: RouteContext) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;
  const actor = adminResult.actor;

  const { id: rawId } = await context.params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await updateSuggestionStatus({
    id,
    status: parsed.data.status,
    adminNotes: parsed.data.adminNotes,
  });

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await writeAdminAuditLog({
    actorUserId: actor.id,
    action: "site_feedback.status_update",
    targetType: "site_suggestion",
    targetId: String(id),
    payload: {
      status: parsed.data.status,
      adminNotes: parsed.data.adminNotes ?? null,
    },
  });

  return NextResponse.json({ item: updated });
}
