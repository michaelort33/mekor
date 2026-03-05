import { sendSendGridEmail } from "@/lib/notifications/sendgrid";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendInvitationEmail(input: {
  toEmail: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
  expiresAt: Date;
}) {
  const safeInviterName = escapeHtml(input.inviterName);
  const safeAcceptUrl = escapeHtml(input.acceptUrl);
  const safeRole = escapeHtml(input.role);
  const expiresLabel = input.expiresAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  await sendSendGridEmail({
    to: input.toEmail,
    subject: `[Mekor] You're invited (${input.role})`,
    text: [
      `Hi,`,
      "",
      `${input.inviterName} invited you to Mekor with role: ${input.role}.`,
      `Your invite link: ${input.acceptUrl}`,
      `This link expires on: ${expiresLabel}`,
      "",
      "If you were not expecting this invitation, ignore this email.",
    ].join("\n"),
    html: `
      <div style="background:#f5efe4;padding:32px 20px;font-family:Georgia,serif;color:#1e2a38;">
        <div style="max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid #e4d8c2;border-radius:24px;overflow:hidden;box-shadow:0 18px 40px rgba(35,42,54,0.12);">
          <div style="padding:28px 32px;background:linear-gradient(135deg,#16324f 0%,#315a86 52%,#b88746 100%);color:#fff7ea;">
            <div style="font-size:12px;letter-spacing:0.22em;text-transform:uppercase;opacity:0.88;">Mekor Habracha</div>
            <h1 style="margin:12px 0 0;font-size:34px;line-height:1.05;font-weight:600;">You&apos;re invited</h1>
          </div>
          <div style="padding:28px 32px 32px;font-family:Arial,sans-serif;">
            <p style="margin:0 0 14px;font-size:16px;line-height:1.6;">${safeInviterName} invited you to Mekor with role: <strong>${safeRole}</strong>.</p>
            <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Use the button below to accept your invitation and finish setting up your account.</p>
            <p style="margin:24px 0;">
              <a href="${safeAcceptUrl}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#1d4f7a;color:#ffffff;text-decoration:none;font-weight:700;">
                Accept invitation
              </a>
            </p>
            <p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#4b5a6c;">This link expires on ${escapeHtml(expiresLabel)}.</p>
            <p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#4b5a6c;">If the button does not open, paste this URL into your browser:</p>
            <p style="margin:0;font-size:14px;line-height:1.7;word-break:break-word;"><a href="${safeAcceptUrl}" style="color:#1d4f7a;">${safeAcceptUrl}</a></p>
          </div>
        </div>
      </div>
    `,
  });
}
