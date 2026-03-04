import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { systemSettings, users } from "@/db/schema";
import { getAdminSession } from "@/lib/admin/session";
import { clearSettingsCache } from "@/lib/config/features";

const updateSchema = z.object({
  key: z.string().trim().min(1).max(120),
  value: z.string(),
});

async function requireSuperAdmin() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.email, session.email)).limit(1);

  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden - Super admin access required" }, { status: 403 });
  }

  return null;
}

export async function GET() {
  const forbidden = await requireSuperAdmin();
  if (forbidden) return forbidden;

  const db = getDb();
  const settings = await db.select().from(systemSettings).orderBy(asc(systemSettings.key));

  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const forbidden = await requireSuperAdmin();
  if (forbidden) return forbidden;

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
