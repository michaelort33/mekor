import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { eventRegistrations, eventSignupSettings, eventTicketTiers, events, users } from "@/db/schema";
import { sendEventWaitlistPromotedEmail } from "@/lib/events/email";

export function resolveWaitlistPromotionState(input: {
  paymentRequiredBySetting: boolean;
  tierPriceCents: number | null;
}) {
  const paymentRequired =
    input.paymentRequiredBySetting || (typeof input.tierPriceCents === "number" && input.tierPriceCents > 0);

  return {
    paymentRequired,
    nextStatus: paymentRequired ? ("payment_pending" as const) : ("registered" as const),
  };
}

export async function promoteWaitlistForEvent(eventId: number) {
  const db = getDb();
  const now = new Date();

  const promoted = await db.transaction(async (tx) => {
    const [nextWaitlisted] = await tx
      .select({
        id: eventRegistrations.id,
        eventId: eventRegistrations.eventId,
        userId: eventRegistrations.userId,
        ticketTierId: eventRegistrations.ticketTierId,
        userEmail: users.email,
        userDisplayName: users.displayName,
        eventTitle: events.title,
        eventPath: events.path,
        tierPriceCents: eventTicketTiers.priceCents,
        paymentRequiredBySetting: eventSignupSettings.paymentRequired,
      })
      .from(eventRegistrations)
      .innerJoin(events, eq(events.id, eventRegistrations.eventId))
      .innerJoin(users, eq(users.id, eventRegistrations.userId))
      .innerJoin(eventSignupSettings, eq(eventSignupSettings.eventId, eventRegistrations.eventId))
      .leftJoin(eventTicketTiers, eq(eventTicketTiers.id, eventRegistrations.ticketTierId))
      .where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, "waitlisted")))
      .orderBy(asc(eventRegistrations.registeredAt), asc(eventRegistrations.id))
      .limit(1);

    if (!nextWaitlisted) {
      return null;
    }

    const promotion = resolveWaitlistPromotionState({
      paymentRequiredBySetting: nextWaitlisted.paymentRequiredBySetting,
      tierPriceCents: nextWaitlisted.tierPriceCents,
    });
    const paymentRequired = promotion.paymentRequired;
    const paymentDueAt = paymentRequired ? new Date(now.getTime() + 30 * 60 * 1000) : null;

    const [updated] = await tx
      .update(eventRegistrations)
      .set({
        status: promotion.nextStatus,
        paymentDueAt,
        stripeCheckoutSessionId: null,
        stripePaymentIntentId: null,
        receiptUrl: "",
        updatedAt: now,
      })
      .where(and(eq(eventRegistrations.id, nextWaitlisted.id), eq(eventRegistrations.status, "waitlisted")))
      .returning({
        id: eventRegistrations.id,
        status: eventRegistrations.status,
        paymentDueAt: eventRegistrations.paymentDueAt,
      });

    if (!updated) {
      return null;
    }

    return {
      registrationId: updated.id,
      status: updated.status,
      paymentDueAt: updated.paymentDueAt ? updated.paymentDueAt.toISOString() : null,
      paymentRequired,
      userEmail: nextWaitlisted.userEmail,
      userDisplayName: nextWaitlisted.userDisplayName,
      eventTitle: nextWaitlisted.eventTitle,
      eventPath: nextWaitlisted.eventPath,
    };
  });

  if (promoted) {
    await sendEventWaitlistPromotedEmail({
      toEmail: promoted.userEmail,
      displayName: promoted.userDisplayName,
      eventTitle: promoted.eventTitle,
      eventPath: promoted.eventPath,
      paymentRequired: promoted.paymentRequired,
      paymentDueAt: promoted.paymentDueAt,
    });
  }

  return promoted;
}
