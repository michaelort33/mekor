import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { communicationPreferences } from "@/db/schema";
import { communicationPreferenceInputSchema } from "@/lib/member-ops/contracts";
import { isMemberOpsEnabled } from "@/lib/member-ops/feature";

export async function POST(request: Request) {
  if (!isMemberOpsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = communicationPreferenceInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();
  const now = new Date();

  const [existing] = await db
    .select({ id: communicationPreferences.id })
    .from(communicationPreferences)
    .where(
      and(
        eq(communicationPreferences.memberId, parsed.data.memberId),
        eq(communicationPreferences.channel, parsed.data.channel),
      ),
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(communicationPreferences)
      .set({
        optIn: parsed.data.optIn,
        consentCapturedAt: now,
        source: parsed.data.source,
        updatedBy: parsed.data.updatedBy,
        updatedAt: now,
      })
      .where(eq(communicationPreferences.id, existing.id))
      .returning();

    return NextResponse.json({ ok: true, preference: updated }, { status: 200 });
  }

  const [created] = await db
    .insert(communicationPreferences)
    .values({
      memberId: parsed.data.memberId,
      channel: parsed.data.channel,
      optIn: parsed.data.optIn,
      consentCapturedAt: now,
      source: parsed.data.source,
      updatedBy: parsed.data.updatedBy,
      updatedAt: now,
    })
    .returning();

  return NextResponse.json({ ok: true, preference: created }, { status: 201 });
}
