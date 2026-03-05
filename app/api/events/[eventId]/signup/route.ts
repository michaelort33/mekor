import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { eventRegistrations, eventSignupSettings, eventTicketTiers, events } from "@/db/schema";
import { getUserSession } from "@/lib/auth/session";
import { featureDisabledResponse, isFeatureEnabled } from "@/lib/config/features";
import { countActiveEventSpots } from "@/lib/events/registrations";

type Params = {
  params: Promise<{ eventId: string }>;
};

const signupPayloadSchema = z.object({
  ticketTierId: z.number().int().min(1).optional(),
});

const DEFAULT_SIGNUP_SETTINGS = {
  id: 0,
  enabled: true,
  capacity: null,
  waitlistEnabled: false,
  paymentRequired: false,
  registrationDeadline: null,
  organizerEmail: "",
} as const;

async function resolveEventContext(eventId: number) {
  const db = getDb();
  const [eventRow] = await db
    .select({
      id: events.id,
      title: events.title,
      path: events.path,
      startAt: events.startAt,
      isClosed: events.isClosed,
    })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!eventRow) {
    return null;
  }

  const [settings] = await db
    .select({
      id: eventSignupSettings.id,
      enabled: eventSignupSettings.enabled,
      capacity: eventSignupSettings.capacity,
      waitlistEnabled: eventSignupSettings.waitlistEnabled,
      paymentRequired: eventSignupSettings.paymentRequired,
      registrationDeadline: eventSignupSettings.registrationDeadline,
      organizerEmail: eventSignupSettings.organizerEmail,
    })
    .from(eventSignupSettings)
    .where(eq(eventSignupSettings.eventId, eventRow.id))
    .limit(1);

  if (!settings) {
    return {
      eventRow,
      settings: { ...DEFAULT_SIGNUP_SETTINGS },
      tiers: [],
    };
  }

  const tiers = await db
    .select({
      id: eventTicketTiers.id,
      name: eventTicketTiers.name,
      priceCents: eventTicketTiers.priceCents,
      currency: eventTicketTiers.currency,
      active: eventTicketTiers.active,
      sortOrder: eventTicketTiers.sortOrder,
    })
    .from(eventTicketTiers)
    .where(eq(eventTicketTiers.eventSignupSettingsId, settings.id))
    .orderBy(asc(eventTicketTiers.sortOrder), asc(eventTicketTiers.id));

  return {
    eventRow,
    settings,
    tiers,
  };
}

export async function GET(_: Request, { params }: Params) {
  if (!(await isFeatureEnabled("FEATURE_EVENT_SIGNUPS"))) {
    return NextResponse.json(featureDisabledResponse("FEATURE_EVENT_SIGNUPS"), { status: 404 });
  }

  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await params;
  const numericEventId = Number(eventId);
  if (!Number.isInteger(numericEventId) || numericEventId < 1) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  const context = await resolveEventContext(numericEventId);
  if (!context) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const registrations = await getDb()
    .select({
      id: eventRegistrations.id,
      userId: eventRegistrations.userId,
      status: eventRegistrations.status,
      registeredAt: eventRegistrations.registeredAt,
      ticketTierId: eventRegistrations.ticketTierId,
      paymentDueAt: eventRegistrations.paymentDueAt,
      stripeCheckoutSessionId: eventRegistrations.stripeCheckoutSessionId,
      shareInFeed: eventRegistrations.shareInFeed,
      signupComment: eventRegistrations.signupComment,
    })
    .from(eventRegistrations)
    .where(eq(eventRegistrations.eventId, numericEventId))
    .orderBy(asc(eventRegistrations.registeredAt));

  const userRegistration = registrations.find((registration) => registration.userId === session.userId) ?? null;
  const activeSpots = countActiveEventSpots(registrations);
  const spotsRemaining =
    typeof context.settings?.capacity === "number" ? Math.max(context.settings.capacity - activeSpots, 0) : null;

  return NextResponse.json({
    event: context.eventRow,
    settings: context.settings,
    tiers: context.tiers.filter((tier) => tier.active),
    userRegistration,
    counts: {
      activeSpots,
      spotsRemaining,
      waitlisted: registrations.filter((registration) => registration.status === "waitlisted").length,
    },
  });
}

export async function POST(request: Request, { params }: Params) {
  if (!(await isFeatureEnabled("FEATURE_EVENT_SIGNUPS"))) {
    return NextResponse.json(featureDisabledResponse("FEATURE_EVENT_SIGNUPS"), { status: 404 });
  }

  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await params;
  const numericEventId = Number(eventId);
  if (!Number.isInteger(numericEventId) || numericEventId < 1) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  const parsed = signupPayloadSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const context = await resolveEventContext(numericEventId);
  if (!context) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (!context.settings.enabled || context.eventRow.isClosed) {
    return NextResponse.json({ error: "Registration unavailable" }, { status: 400 });
  }
  if (context.settings.registrationDeadline && new Date(context.settings.registrationDeadline) < new Date()) {
    return NextResponse.json({ error: "Registration deadline has passed" }, { status: 400 });
  }

  const db = getDb();

  const selectedTier = parsed.data.ticketTierId
    ? context.tiers.find((tier) => tier.id === parsed.data.ticketTierId && tier.active)
    : null;

  if (parsed.data.ticketTierId && !selectedTier) {
    return NextResponse.json({ error: "Ticket tier not found" }, { status: 404 });
  }

  const requiresPayment = context.settings.paymentRequired || Boolean(selectedTier && selectedTier.priceCents > 0);

  const result = await db.transaction(async (tx) => {
    const existing = await tx
      .select({
        id: eventRegistrations.id,
        status: eventRegistrations.status,
      })
      .from(eventRegistrations)
      .where(and(eq(eventRegistrations.eventId, numericEventId), eq(eventRegistrations.userId, session.userId)))
      .limit(1);

    if (existing.length > 0 && existing[0]?.status !== "cancelled") {
      return { error: "Already registered", status: 409 as const };
    }
    const cancelledRegistrationId = existing[0]?.status === "cancelled" ? existing[0].id : null;

    const registrations = await tx
      .select({
        id: eventRegistrations.id,
        status: eventRegistrations.status,
        registeredAt: eventRegistrations.registeredAt,
      })
      .from(eventRegistrations)
      .where(eq(eventRegistrations.eventId, numericEventId));

    const activeSpots = countActiveEventSpots(registrations);
    const isFull = typeof context.settings.capacity === "number" && activeSpots >= context.settings.capacity;

    if (isFull) {
      if (!context.settings.waitlistEnabled) {
        return { error: "Event is full", status: 409 as const };
      }

      const [waitlisted] = cancelledRegistrationId
        ? await tx
            .update(eventRegistrations)
            .set({
              status: "waitlisted",
              ticketTierId: selectedTier?.id ?? null,
              paymentDueAt: null,
              stripeCheckoutSessionId: null,
              stripePaymentIntentId: null,
              receiptUrl: "",
              registeredAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(eventRegistrations.id, cancelledRegistrationId))
            .returning({
              id: eventRegistrations.id,
              status: eventRegistrations.status,
            })
        : await tx
            .insert(eventRegistrations)
            .values({
              eventId: numericEventId,
              userId: session.userId,
              ticketTierId: selectedTier?.id,
              status: "waitlisted",
            })
            .returning({
              id: eventRegistrations.id,
              status: eventRegistrations.status,
            });

      return { registration: waitlisted, checkoutRequired: false };
    }

    const [registration] = cancelledRegistrationId
      ? await tx
          .update(eventRegistrations)
          .set({
            ticketTierId: selectedTier?.id ?? null,
            status: requiresPayment ? "payment_pending" : "registered",
            paymentDueAt: requiresPayment ? new Date(Date.now() + 30 * 60 * 1000) : null,
            stripeCheckoutSessionId: null,
            stripePaymentIntentId: null,
            receiptUrl: "",
            registeredAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(eventRegistrations.id, cancelledRegistrationId))
          .returning({
            id: eventRegistrations.id,
            status: eventRegistrations.status,
          })
      : await tx
          .insert(eventRegistrations)
          .values({
            eventId: numericEventId,
            userId: session.userId,
            ticketTierId: selectedTier?.id,
            status: requiresPayment ? "payment_pending" : "registered",
            paymentDueAt: requiresPayment ? new Date(Date.now() + 30 * 60 * 1000) : null,
          })
          .returning({
            id: eventRegistrations.id,
            status: eventRegistrations.status,
          });

    return { registration, checkoutRequired: requiresPayment };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
