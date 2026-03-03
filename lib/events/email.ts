import { Resend } from "resend";

import { getFormNotifyFrom, getFormNotifyTo, getResendApiKey } from "@/lib/forms/config";

export async function sendEventOrganizerMessage(input: {
  organizerEmail: string;
  eventTitle: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
}) {
  const resend = new Resend(getResendApiKey());

  await resend.emails.send({
    from: getFormNotifyFrom(),
    to: [input.organizerEmail || getFormNotifyTo()],
    subject: `[Mekor Event] ${input.eventTitle}: ${input.subject}`,
    text: [
      `From: ${input.senderName} <${input.senderEmail}>`,
      `Event: ${input.eventTitle}`,
      `Subject: ${input.subject}`,
      "",
      input.message,
    ].join("\n"),
  });
}

export async function sendEventReminderEmail(input: {
  toEmail: string;
  displayName: string;
  eventTitle: string;
  eventPath: string;
}) {
  const resend = new Resend(getResendApiKey());

  await resend.emails.send({
    from: getFormNotifyFrom(),
    to: [input.toEmail],
    subject: `[Mekor Reminder] ${input.eventTitle} starts soon`,
    text: [
      `Hi ${input.displayName},`,
      "",
      `${input.eventTitle} starts within 24 hours.`,
      `Event page: ${input.eventPath}`,
      "",
      "Thanks,",
      "Mekor Habracha",
    ].join("\n"),
  });
}

export async function sendDuesReminderEmail(input: {
  toEmail: string;
  displayName: string;
  invoiceLabel: string;
  amountText: string;
  dueDate: string;
}) {
  const resend = new Resend(getResendApiKey());

  await resend.emails.send({
    from: getFormNotifyFrom(),
    to: [input.toEmail],
    subject: `[Mekor Dues] Reminder for ${input.invoiceLabel}`,
    text: [
      `Hi ${input.displayName},`,
      "",
      `This is a reminder about ${input.invoiceLabel}.`,
      `Amount: ${input.amountText}`,
      `Due date: ${input.dueDate}`,
      "",
      "Please visit your account dues page to pay.",
      "",
      "Mekor Habracha",
    ].join("\n"),
  });
}
