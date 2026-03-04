import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { duesNotificationLog } from "@/db/schema";
import { sendSendGridEmail } from "@/lib/notifications/sendgrid";

export type DuesNotificationType =
  | "invoice_created"
  | "payment_succeeded"
  | "payment_failed"
  | "overdue_d30"
  | "overdue_d7"
  | "overdue_d1"
  | "overdue_weekly";

export function reminderTypeToDuesNotificationType(reminderType: "d30" | "d7" | "d1" | "overdue_weekly"): DuesNotificationType {
  if (reminderType === "d30") return "overdue_d30";
  if (reminderType === "d7") return "overdue_d7";
  if (reminderType === "d1") return "overdue_d1";
  return "overdue_weekly";
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function buildSubject(input: {
  notificationType: DuesNotificationType;
  invoiceLabel: string;
}) {
  if (input.notificationType === "invoice_created") {
    return `[Mekor Dues] New invoice: ${input.invoiceLabel}`;
  }
  if (input.notificationType === "payment_succeeded") {
    return `[Mekor Dues] Payment received: ${input.invoiceLabel}`;
  }
  if (input.notificationType === "payment_failed") {
    return `[Mekor Dues] Payment failed: ${input.invoiceLabel}`;
  }
  if (input.notificationType === "overdue_weekly") {
    return `[Mekor Dues] Overdue reminder: ${input.invoiceLabel}`;
  }
  return `[Mekor Dues] Reminder: ${input.invoiceLabel}`;
}

function buildBody(input: {
  notificationType: DuesNotificationType;
  displayName: string;
  invoiceLabel: string;
  amountCents: number;
  currency: string;
  dueDate: string;
}) {
  const amountText = formatMoney(input.amountCents, input.currency);
  const common = [
    `Hi ${input.displayName},`,
    "",
    `${input.invoiceLabel}`,
    `Amount: ${amountText}`,
    `Due date: ${input.dueDate}`,
    "",
    "Visit your dues page to view or pay: /account/dues",
    "",
    "Mekor Habracha",
  ];

  if (input.notificationType === "invoice_created") {
    return ["A new dues invoice has been created for your account.", "", ...common].join("\n");
  }

  if (input.notificationType === "payment_succeeded") {
    return ["Thank you, your payment was received successfully.", "", ...common].join("\n");
  }

  if (input.notificationType === "payment_failed") {
    return ["Your recent payment attempt did not complete.", "Please retry from your dues page.", "", ...common].join("\n");
  }

  if (input.notificationType === "overdue_weekly") {
    return ["This invoice is still overdue.", "Please pay as soon as possible.", "", ...common].join("\n");
  }

  return ["This is a reminder for your upcoming dues invoice.", "", ...common].join("\n");
}

export async function sendDuesNotification(input: {
  referenceKey: string;
  userId: number;
  userEmail: string;
  displayName: string;
  notificationType: DuesNotificationType;
  invoiceId: number | null;
  paymentId: number | null;
  invoiceLabel: string;
  amountCents: number;
  currency: string;
  dueDate: string;
}) {
  const db = getDb();
  const [existing] = await db
    .select({
      id: duesNotificationLog.id,
      deliveryStatus: duesNotificationLog.deliveryStatus,
    })
    .from(duesNotificationLog)
    .where(eq(duesNotificationLog.referenceKey, input.referenceKey))
    .limit(1);

  if (existing?.deliveryStatus === "sent") {
    return { sent: false, deduped: true };
  }

  try {
    const sent = await sendSendGridEmail({
      to: input.userEmail,
      subject: buildSubject({
        notificationType: input.notificationType,
        invoiceLabel: input.invoiceLabel,
      }),
      text: buildBody({
        notificationType: input.notificationType,
        displayName: input.displayName,
        invoiceLabel: input.invoiceLabel,
        amountCents: input.amountCents,
        currency: input.currency,
        dueDate: input.dueDate,
      }),
    });

    await db
      .insert(duesNotificationLog)
      .values({
        referenceKey: input.referenceKey,
        userId: input.userId,
        invoiceId: input.invoiceId,
        paymentId: input.paymentId,
        notificationType: input.notificationType,
        provider: "sendgrid",
        providerMessageId: sent.providerMessageId,
        deliveryStatus: "sent",
        errorMessage: "",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: duesNotificationLog.referenceKey,
        set: {
          userId: input.userId,
          invoiceId: input.invoiceId,
          paymentId: input.paymentId,
          notificationType: input.notificationType,
          provider: "sendgrid",
          providerMessageId: sent.providerMessageId,
          deliveryStatus: "sent",
          errorMessage: "",
          updatedAt: new Date(),
        },
      });

    return { sent: true, deduped: false };
  } catch (error) {
    await db
      .insert(duesNotificationLog)
      .values({
        referenceKey: input.referenceKey,
        userId: input.userId,
        invoiceId: input.invoiceId,
        paymentId: input.paymentId,
        notificationType: input.notificationType,
        provider: "sendgrid",
        providerMessageId: "",
        deliveryStatus: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown send failure",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: duesNotificationLog.referenceKey,
        set: {
          deliveryStatus: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown send failure",
          updatedAt: new Date(),
        },
      });

    return { sent: false, deduped: false };
  }
}
