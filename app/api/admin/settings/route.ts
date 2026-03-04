import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { systemSettings } from "@/db/schema";
import { requireSuperAdminActor } from "@/lib/admin/actor";
import { clearSettingsCache } from "@/lib/config/features";

const updateSchema = z.object({
  key: z.string().trim().min(1).max(120),
  value: z.string(),
});

export async function GET() {
  const result = await requireSuperAdminActor();
  if ("error" in result) return result.error;

  const db = getDb();
  const settings = await db.select().from(systemSettings).orderBy(asc(systemSettings.key));

  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const result = await requireSuperAdminActor();
  if ("error" in result) return result.error;

  const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const [existing] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, parsed.data.key))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Setting not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(systemSettings)
    .set({
      value: parsed.data.value,
      updatedAt: new Date(),
    })
    .where(eq(systemSettings.key, parsed.data.key))
    .returning();

  clearSettingsCache();

  return NextResponse.json({ setting: updated });
}
