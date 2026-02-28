import { Resend } from "resend";

import { getFormNotifyFrom, getFormNotifyTo, getResendApiKey } from "@/lib/forms/config";

type FormEmailPayload = {
  formType: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  sourcePath: string;
  submissionId: number;
};

export async function sendFormNotification(payload: FormEmailPayload) {
  const resend = new Resend(getResendApiKey());

  const text = [
    `Form Type: ${payload.formType}`,
    `Submission ID: ${payload.submissionId}`,
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Phone: ${payload.phone || ""}`,
    `Source Path: ${payload.sourcePath || ""}`,
    "",
    payload.message,
  ].join("\n");

  await resend.emails.send({
    from: getFormNotifyFrom(),
    to: [getFormNotifyTo()],
    subject: `[Mekor] ${payload.formType} form submission`,
    text,
  });
}
