import { and, eq, inArray, lte } from "drizzle-orm";

import { getDb } from "@/db/client";
import { duesInvoices, duesSchedules, users } from "@/db/schema";
import { sendDuesNotification } from "@/lib/dues/notifications";

function toDateOnlyUtc(value: Date) {
  return value.toISOString().slice(0, 10);
}

function parseDateOnlyUtc(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function addMonthsUtc(value: string, monthsToAdd: number) {
  const source = parseDateOnlyUtc(value);
  const year = source.getUTCFullYear();
  const month = source.getUTCMonth();
  const day = source.getUTCDate();

  const targetYear = year + Math.floor((month + monthsToAdd) / 12);
  const targetMonth = (month + monthsToAdd) % 12;
  const normalizedTargetMonth = targetMonth < 0 ? targetMonth + 12 : targetMonth;
  const normalizedTargetYear = targetMonth < 0 ? targetYear - 1 : targetYear;
  const lastDay = new Date(Date.UTC(normalizedTargetYear, normalizedTargetMonth + 1, 0)).getUTCDate();
  const next = new Date(Date.UTC(normalizedTargetYear, normalizedTargetMonth, Math.min(day, lastDay)));
  return toDateOnlyUtc(next);
}

export function getNextScheduleDate(input: {
  frequency: "annual" | "monthly" | "custom";
  currentDate: string;
}) {
  if (input.frequency === "annual") {
    return addMonthsUtc(input.currentDate, 12);
  }
  if (input.frequency === "monthly") {
    return addMonthsUtc(input.currentDate, 1);
  }
  return input.currentDate;
}

export async function runDuesScheduleInvoicing(input?: { now?: Date }) {
  const db = getDb();
  const now = input?.now ?? new Date();
  const today = toDateOnlyUtc(now);

  const dueSchedules = await db
    .select({
      id: duesSchedules.id,
      userId: duesSchedules.userId,
      frequency: duesSchedules.frequency,
      amountCents: duesSchedules.amountCents,
      currency: duesSchedules.currency,
      nextDueDate: duesSchedules.nextDueDate,
      active: duesSchedules.active,
      notes: duesSchedules.notes,
      userEmail: users.email,
      userDisplayName: users.displayName,
    })
    .from(duesSchedules)
    .innerJoin(users, eq(users.id, duesSchedules.userId))
    .where(and(eq(duesSchedules.active, true), lte(duesSchedules.nextDueDate, today)));

  let createdInvoices = 0;
  let deduped = 0;
  let notificationsSent = 0;
  let notificationsFailed = 0;
  let advancedSchedules = 0;

  for (const schedule of dueSchedules) {
    const [existingInvoice] = await db
      .select({ id: duesInvoices.id })
      .from(duesInvoices)
      .where(
        and(
          eq(duesInvoices.scheduleId, schedule.id),
          eq(duesInvoices.userId, schedule.userId),
          eq(duesInvoices.dueDate, schedule.nextDueDate),
          inArray(duesInvoices.status, ["open", "overdue", "paid"]),
        ),
      )
      .limit(1);

    let invoiceId = existingInvoice?.id ?? null;
    if (!existingInvoice) {
      const [created] = await db
        .insert(duesInvoices)
        .values({
          userId: schedule.userId,
          scheduleId: schedule.id,
          label: "Membership dues",
          amountCents: schedule.amountCents,
          currency: schedule.currency,
          dueDate: schedule.nextDueDate,
          status: "open",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: duesInvoices.id });

      invoiceId = created.id;
      createdInvoices += 1;
    } else {
      deduped += 1;
    }

    if (invoiceId) {
      const notification = await sendDuesNotification({
        referenceKey: `invoice:${invoiceId}:invoice_created`,
        userId: schedule.userId,
        userEmail: schedule.userEmail,
        displayName: schedule.userDisplayName,
        notificationType: "invoice_created",
        invoiceId,
        paymentId: null,
        invoiceLabel: "Membership dues",
        amountCents: schedule.amountCents,
        currency: schedule.currency,
        dueDate: schedule.nextDueDate,
      });

      if (notification.sent) {
        notificationsSent += 1;
      } else if (!notification.deduped) {
        notificationsFailed += 1;
      }
    }

    if (schedule.frequency !== "custom") {
      const nextDueDate = getNextScheduleDate({
        frequency: schedule.frequency,
        currentDate: schedule.nextDueDate,
      });
      await db
        .update(duesSchedules)
        .set({
          nextDueDate,
          updatedAt: new Date(),
        })
        .where(eq(duesSchedules.id, schedule.id));
      advancedSchedules += 1;
    }
  }

  return {
    ok: true,
    runDate: today,
    dueSchedules: dueSchedules.length,
    createdInvoices,
    deduped,
    notificationsSent,
    notificationsFailed,
    advancedSchedules,
  };
}
