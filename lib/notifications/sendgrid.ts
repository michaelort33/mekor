import { getFormNotifyFrom } from "@/lib/forms/config";

export type SendGridEmailInput = {
  to: string;
  subject: string;
  text: string;
  from?: string;
};

function getSendGridApiKey() {
  const value = process.env.SENDGRID_API_KEY;
  if (!value) {
    throw new Error("SENDGRID_API_KEY is required");
  }
  return value;
}

function getSendGridFromEmail() {
  return process.env.SENDGRID_FROM_EMAIL || getFormNotifyFrom();
}

export async function sendSendGridEmail(input: SendGridEmailInput) {
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSendGridApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: input.to }],
        },
      ],
      from: { email: input.from || getSendGridFromEmail() },
      subject: input.subject,
      content: [
        {
          type: "text/plain",
          value: input.text,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`SendGrid request failed (${response.status}): ${errorBody}`);
  }

  return {
    providerMessageId: response.headers.get("x-message-id") ?? "",
  };
}
