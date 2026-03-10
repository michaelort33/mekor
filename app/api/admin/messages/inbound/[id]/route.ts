import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { adminInboxEvents } from "@/db/schema";
import { requireAdminActor, writeAdminAuditLog } from "@/lib/admin/actor";

const updateSchema = z.object({
  status: z.enum(["new", "read", "archived"]),
});

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  const result = await requireAdminActor();
  if ("error" in result) return result.error;

  const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const params = await context.params;
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid inbox event id" }, { status: 400 });
  }

  const [event] = await getDb()
    .update(adminInboxEvents)
    .set({
      status: parsed.data.status,
      updatedAt: new Date(),
    })
    .where(eq(adminInboxEvents.id, id))
    .returning();

  if (!event) {
    return NextResponse.json({ error: "Inbox event not found" }, { status: 404 });
  }

  await writeAdminAuditLog({
    actorUserId: result.actor.id,
    action: "admin_inbox_status_update",
    targetType: "admin_inbox_event",
    targetId: String(event.id),
    payload: {
      status: parsed.data.status,
    },
  });

  return NextResponse.json({ event });
}
