import { Resend } from "resend";

import { getFormNotifyFrom, getResendApiKey } from "@/lib/forms/config";

export async function sendInvitationEmail(input: {
  toEmail: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
  expiresAt: Date;
}) {
  const resend = new Resend(getResendApiKey());

  await resend.emails.send({
    from: getFormNotifyFrom(),
    to: [input.toEmail],
    subject: `[Mekor] You're invited (${input.role})`,
    text: [
      `Hi,`,
      "",
      `${input.inviterName} invited you to Mekor with role: ${input.role}.`,
      `Your invite link: ${input.acceptUrl}`,
      `This link expires on: ${input.expiresAt.toISOString()}`,
      "",
      "If you were not expecting this invitation, ignore this email.",
    ].join("\n"),
  });
}
