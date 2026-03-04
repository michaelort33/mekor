import { and, eq, inArray, lt } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { duesInvoices, duesReminderLog, users } from "@/db/schema";
import { featureDisabledResponse, isFeatureEnabled } from "@/lib/config/features";
import { reminderTypeToDuesNotificationType, sendDuesNotification } from "@/lib/dues/notifications";
import { dueReminderTypeForDate } from "@/lib/dues/reminders";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return true;
  }

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!(await isFeatureEnabled("FEATURE_DUES"))) {
    return NextResponse.json(featureDisabledResponse("FEATURE_DUES"), { status: 404 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const now = new Date();

  await db
    .update(duesInvoices)
    .set({
      status: "overdue",
      updatedAt: new Date(),
    })
    .where(and(eq(duesInvoices.status, "open"), lt(duesInvoices.dueDate, now.toISOString().slice(0, 10))));

  const rows = await db
    .select({
      invoiceId: duesInvoices.id,
      userId: duesInvoices.userId,
      label: duesInvoices.label,
      amountCents: duesInvoices.amountCents,
      currency: duesInvoices.currency,
      dueDate: duesInvoices.dueDate,
      email: users.email,
      displayName: users.displayName,
    })
    .from(duesInvoices)
    .innerJoin(users, eq(users.id, duesInvoices.userId))
    .where(inArray(duesInvoices.status, ["open", "overdue"]));

  let sent = 0;

  for (const row of rows) {
    const reminderType = dueReminderTypeForDate({
      dueDate: new Date(`${row.dueDate}T00:00:00.000Z`),
      now,
    });

    if (!reminderType) {
      continue;
    }

    const [existingLog] = await db
      .select({ id: duesReminderLog.id })
      .from(duesReminderLog)
      .where(and(eq(duesReminderLog.invoiceId, row.invoiceId), eq(duesReminderLog.reminderType, reminderType)))
      .limit(1);

    if (existingLog) {
      continue;
    }

    const notificationType = reminderTypeToDuesNotificationType(reminderType);
    const notificationResult = await sendDuesNotification({
      referenceKey: `invoice:${row.invoiceId}:reminder:${reminderType}`,
      userId: row.userId,
      userEmail: row.email,
      displayName: row.displayName,
      notificationType,
      invoiceId: row.invoiceId,
      paymentId: null,
      invoiceLabel: row.label,
      amountCents: row.amountCents,
      currency: row.currency,
      dueDate: row.dueDate,
    });

    if (!notificationResult.sent) {
      continue;
    }

    await db.insert(duesReminderLog).values({
      invoiceId: row.invoiceId,
      reminderType,
      updatedAt: new Date(),
    });

    sent += 1;
  }

  return NextResponse.json({ ok: true, sent });
}
