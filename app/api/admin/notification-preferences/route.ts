import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { adminNotificationPreferences } from "@/db/schema";
import {
  ADMIN_NOTIFICATION_CATEGORIES,
  getCategoryLabel,
  type AdminNotificationCategory,
} from "@/lib/admin/inbox";
import { requireSuperAdminActor } from "@/lib/admin/actor";

const updateSchema = z.object({
  category: z.enum(ADMIN_NOTIFICATION_CATEGORIES),
  enabled: z.boolean(),
});

export async function GET() {
  const result = await requireSuperAdminActor();
  if ("error" in result) return result.error;

  const rows = await getDb()
    .select({
      id: adminNotificationPreferences.id,
      category: adminNotificationPreferences.category,
      enabled: adminNotificationPreferences.enabled,
    })
    .from(adminNotificationPreferences)
    .where(eq(adminNotificationPreferences.userId, result.actor.id))
    .orderBy(asc(adminNotificationPreferences.category));

  const byCategory = new Map(rows.map((row) => [row.category, row]));
  const preferences = ADMIN_NOTIFICATION_CATEGORIES.map((category) => ({
    category,
    label: getCategoryLabel(category),
    enabled: byCategory.get(category)?.enabled ?? false,
  }));

  return NextResponse.json({ preferences });
}

export async function PUT(request: Request) {
  const result = await requireSuperAdminActor();
  if ("error" in result) return result.error;

  const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { category, enabled } = parsed.data;
  const db = getDb();
  const [existing] = await db
    .select({
      id: adminNotificationPreferences.id,
    })
    .from(adminNotificationPreferences)
    .where(and(eq(adminNotificationPreferences.userId, result.actor.id), eq(adminNotificationPreferences.category, category)))
    .orderBy(asc(adminNotificationPreferences.id));

  const [preference] = existing && existing.id
    ? await db
        .update(adminNotificationPreferences)
        .set({
          enabled,
          updatedAt: new Date(),
        })
        .where(eq(adminNotificationPreferences.id, existing.id))
        .returning()
    : await db
        .insert(adminNotificationPreferences)
        .values({
          userId: result.actor.id,
          category: category as AdminNotificationCategory,
          enabled,
        })
        .returning();

  return NextResponse.json({ preference });
}
