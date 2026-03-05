import { asc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { eventSignupSettings, eventTicketTiers, events } from "@/db/schema";
import { requireAdminActor } from "@/lib/admin/actor";
import { featureDisabledResponse, isFeatureEnabled } from "@/lib/config/features";
import { toAdminEventSignupSettings } from "@/lib/events/admin-signup-settings";

const tierSchema = z.object({
  name: z.string().trim().min(1).max(120),
  priceCents: z.number().int().min(0),
  currency: z.string().trim().length(3).default("usd"),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const updateSchema = z.object({
  eventId: z.number().int().min(1),
  enabled: z.boolean(),
  capacity: z.number().int().min(1).nullable(),
  waitlistEnabled: z.boolean(),
  paymentRequired: z.boolean(),
  registrationDeadline: z.string().trim().min(1).nullable(),
  organizerEmail: z.string().trim().max(255),
  tiers: z.array(tierSchema).optional(),
});

async function requireAdmin() {
  const result = await requireAdminActor();
  if ("error" in result) return result.error;
  return null;
}

export async function GET(request: Request) {
  if (!(await isFeatureEnabled("FEATURE_EVENT_SIGNUPS"))) {
    return NextResponse.json(featureDisabledResponse("FEATURE_EVENT_SIGNUPS"), { status: 404 });
  }

  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const eventId = Number(url.searchParams.get("eventId") || "0");

  const rows = await getDb()
    .select({
      id: eventSignupSettings.id,
      eventId: events.id,
      eventTitle: events.title,
      eventPath: events.path,
      enabled: eventSignupSettings.enabled,
      capacity: eventSignupSettings.capacity,
      waitlistEnabled: eventSignupSettings.waitlistEnabled,
      paymentRequired: eventSignupSettings.paymentRequired,
      registrationDeadline: eventSignupSettings.registrationDeadline,
      organizerEmail: eventSignupSettings.organizerEmail,
      updatedAt: eventSignupSettings.updatedAt,
    })
    .from(events)
    .leftJoin(eventSignupSettings, eq(eventSignupSettings.eventId, events.id))
    .where(Number.isInteger(eventId) && eventId > 0 ? eq(events.id, eventId) : undefined)
    .orderBy(asc(events.title));

  const settingIds = rows.map((row) => row.id).filter((value): value is number => typeof value === "number");
  const tiers =
    settingIds.length === 0
      ? []
      : await getDb()
          .select({
            id: eventTicketTiers.id,
            eventSignupSettingsId: eventTicketTiers.eventSignupSettingsId,
            name: eventTicketTiers.name,
            priceCents: eventTicketTiers.priceCents,
            currency: eventTicketTiers.currency,
            active: eventTicketTiers.active,
            sortOrder: eventTicketTiers.sortOrder,
          })
          .from(eventTicketTiers)
          .where(inArray(eventTicketTiers.eventSignupSettingsId, settingIds))
          .orderBy(asc(eventTicketTiers.sortOrder), asc(eventTicketTiers.id));

  const tiersBySetting = new Map<number, typeof tiers>();
  for (const tier of tiers) {
    const existing = tiersBySetting.get(tier.eventSignupSettingsId) ?? [];
    existing.push(tier);
    tiersBySetting.set(tier.eventSignupSettingsId, existing);
  }

  return NextResponse.json({
    settings: rows.map((row) => toAdminEventSignupSettings(row, tiersBySetting)),
  });
}

export async function PUT(request: Request) {
  if (!(await isFeatureEnabled("FEATURE_EVENT_SIGNUPS"))) {
    return NextResponse.json(featureDisabledResponse("FEATURE_EVENT_SIGNUPS"), { status: 404 });
  }

  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const db = getDb();

  const [existing] = await db
    .select({
      id: eventSignupSettings.id,
    })
    .from(eventSignupSettings)
    .where(eq(eventSignupSettings.eventId, parsed.data.eventId))
    .limit(1);

  const [saved] = existing
    ? await db
        .update(eventSignupSettings)
        .set({
          enabled: parsed.data.enabled,
          capacity: parsed.data.capacity,
          waitlistEnabled: parsed.data.waitlistEnabled,
          paymentRequired: parsed.data.paymentRequired,
          registrationDeadline: parsed.data.registrationDeadline ? new Date(parsed.data.registrationDeadline) : null,
          organizerEmail: parsed.data.organizerEmail,
          updatedAt: new Date(),
        })
        .where(eq(eventSignupSettings.id, existing.id))
        .returning({ id: eventSignupSettings.id })
    : await db
        .insert(eventSignupSettings)
        .values({
          eventId: parsed.data.eventId,
          enabled: parsed.data.enabled,
          capacity: parsed.data.capacity,
          waitlistEnabled: parsed.data.waitlistEnabled,
          paymentRequired: parsed.data.paymentRequired,
          registrationDeadline: parsed.data.registrationDeadline ? new Date(parsed.data.registrationDeadline) : null,
          organizerEmail: parsed.data.organizerEmail,
          updatedAt: new Date(),
        })
        .returning({ id: eventSignupSettings.id });

  if (parsed.data.tiers) {
    await db.delete(eventTicketTiers).where(eq(eventTicketTiers.eventSignupSettingsId, saved.id));

    if (parsed.data.tiers.length > 0) {
      await db.insert(eventTicketTiers).values(
        parsed.data.tiers.map((tier) => ({
          eventSignupSettingsId: saved.id,
          name: tier.name,
          priceCents: tier.priceCents,
          currency: tier.currency.toLowerCase(),
          active: tier.active,
          sortOrder: tier.sortOrder,
          updatedAt: new Date(),
        })),
      );
    }
  }

  return NextResponse.json({ ok: true, eventSignupSettingsId: saved.id });
}
