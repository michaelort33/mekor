import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { duesSchedules, users } from "@/db/schema";
import { requireAdminActor } from "@/lib/admin/actor";
import { featureDisabledResponse, isFeatureEnabled } from "@/lib/config/features";

const createSchema = z.object({
  userId: z.number().int().min(1),
  frequency: z.enum(["annual", "monthly", "custom"]),
  amountCents: z.number().int().min(1),
  currency: z.string().trim().length(3).default("usd"),
  nextDueDate: z.string().trim().min(1),
  active: z.boolean().default(true),
  notes: z.string().trim().default(""),
});

const updateSchema = createSchema.partial().extend({
  id: z.number().int().min(1),
});

export async function GET(request: Request) {
  if (!(await isFeatureEnabled("FEATURE_DUES"))) {
    return NextResponse.json(featureDisabledResponse("FEATURE_DUES"), { status: 404 });
  }

  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const url = new URL(request.url);
  const userId = Number(url.searchParams.get("userId") || "0");

  const rows = await getDb()
    .select({
      id: duesSchedules.id,
      userId: duesSchedules.userId,
      userEmail: users.email,
      userDisplayName: users.displayName,
      frequency: duesSchedules.frequency,
      amountCents: duesSchedules.amountCents,
      currency: duesSchedules.currency,
      nextDueDate: duesSchedules.nextDueDate,
      active: duesSchedules.active,
      notes: duesSchedules.notes,
      updatedAt: duesSchedules.updatedAt,
    })
    .from(duesSchedules)
    .innerJoin(users, eq(users.id, duesSchedules.userId))
    .where(Number.isInteger(userId) && userId > 0 ? eq(duesSchedules.userId, userId) : undefined)
    .orderBy(asc(users.displayName), asc(duesSchedules.nextDueDate));

  return NextResponse.json({ schedules: rows });
}

export async function POST(request: Request) {
  if (!(await isFeatureEnabled("FEATURE_DUES"))) {
    return NextResponse.json(featureDisabledResponse("FEATURE_DUES"), { status: 404 });
  }

  const adminResult2 = await requireAdminActor();
  if ("error" in adminResult2) return adminResult2.error;

  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const [created] = await getDb()
    .insert(duesSchedules)
    .values({
      userId: parsed.data.userId,
      frequency: parsed.data.frequency,
      amountCents: parsed.data.amountCents,
      currency: parsed.data.currency.toLowerCase(),
      nextDueDate: parsed.data.nextDueDate,
      active: parsed.data.active,
      notes: parsed.data.notes,
      updatedAt: new Date(),
    })
    .returning();

  return NextResponse.json({ schedule: created }, { status: 201 });
}

export async function PUT(request: Request) {
  if (!(await isFeatureEnabled("FEATURE_DUES"))) {
    return NextResponse.json(featureDisabledResponse("FEATURE_DUES"), { status: 404 });
  }

  const adminResult3 = await requireAdminActor();
  if ("error" in adminResult3) return adminResult3.error;

  const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = await getDb()
    .update(duesSchedules)
    .set({
      userId: parsed.data.userId,
      frequency: parsed.data.frequency,
      amountCents: parsed.data.amountCents,
      currency: parsed.data.currency?.toLowerCase(),
      nextDueDate: parsed.data.nextDueDate,
      active: parsed.data.active,
      notes: parsed.data.notes,
      updatedAt: new Date(),
    })
    .where(eq(duesSchedules.id, parsed.data.id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  return NextResponse.json({ schedule: updated });
}
