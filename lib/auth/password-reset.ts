import { createHash, randomBytes } from "node:crypto";

import { sendSendGridEmail } from "@/lib/notifications/sendgrid";

export const PASSWORD_RESET_TTL_HOURS = 2;

export function generatePasswordResetToken() {
  return randomBytes(32).toString("base64url");
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function passwordResetExpiryFromNow() {
  return new Date(Date.now() + PASSWORD_RESET_TTL_HOURS * 60 * 60 * 1000);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendPasswordResetEmail(input: {
  toEmail: string;
  displayName: string;
  resetUrl: string;
  expiresAt: Date;
}) {
  const firstName = input.displayName.trim().split(/\s+/)[0] || "there";
  const safeFirstName = escapeHtml(firstName);
  const safeResetUrl = escapeHtml(input.resetUrl);
  const expiresLabel = input.expiresAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  await sendSendGridEmail({
    to: input.toEmail,
    subject: "Reset your Mekor password",
    text: [
      `Hi ${firstName},`,
      "",
      "We received a request to reset your Mekor password.",
      `Use this link to choose a new password: ${input.resetUrl}`,
      "",
      `This link expires on ${expiresLabel}.`,
      "",
      "If you did not request this change, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="background:#f5efe4;padding:32px 20px;font-family:Georgia,serif;color:#1e2a38;">
        <div style="max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid #e4d8c2;border-radius:24px;overflow:hidden;box-shadow:0 18px 40px rgba(35,42,54,0.12);">
          <div style="padding:28px 32px;background:linear-gradient(135deg,#16324f 0%,#315a86 52%,#b88746 100%);color:#fff7ea;">
            <div style="font-size:12px;letter-spacing:0.22em;text-transform:uppercase;opacity:0.88;">Mekor Habracha</div>
            <h1 style="margin:12px 0 0;font-size:34px;line-height:1.05;font-weight:600;">Reset your password</h1>
          </div>
          <div style="padding:28px 32px 32px;font-family:Arial,sans-serif;">
            <p style="margin:0 0 14px;font-size:16px;line-height:1.6;">Hi ${safeFirstName},</p>
            <p style="margin:0 0 14px;font-size:16px;line-height:1.6;">
              We received a request to reset your Mekor password. Use the button below to choose a new one.
            </p>
            <p style="margin:24px 0;">
              <a href="${safeResetUrl}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#1d4f7a;color:#ffffff;text-decoration:none;font-weight:700;">
                Choose a new password
              </a>
            </p>
            <p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#4b5a6c;">
              This link expires on ${escapeHtml(expiresLabel)}.
            </p>
            <p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#4b5a6c;">
              If the button does not open, paste this URL into your browser:
            </p>
            <p style="margin:0;font-size:14px;line-height:1.7;word-break:break-word;">
              <a href="${safeResetUrl}" style="color:#1d4f7a;">${safeResetUrl}</a>
            </p>
          </div>
        </div>
      </div>
    `,
  });
}
