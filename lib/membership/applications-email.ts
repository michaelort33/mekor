import { sendSendGridEmail } from "@/lib/notifications/sendgrid";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendMembershipApprovalEmail(input: {
  toEmail: string;
  firstName: string;
  membershipLabel: string;
  loginUrl: string;
  acceptUrl?: string;
}) {
  const firstName = input.firstName.trim() || "there";
  const safeFirstName = escapeHtml(firstName);
  const safeMembershipLabel = escapeHtml(input.membershipLabel);
  const safeLoginUrl = escapeHtml(input.loginUrl);
  const safeAcceptUrl = input.acceptUrl ? escapeHtml(input.acceptUrl) : "";
  const primaryUrl = input.acceptUrl ? safeAcceptUrl : safeLoginUrl;
  const primaryLabel = input.acceptUrl ? "Set up your member account" : "Open the member hub";
  const nextStepTitle = input.acceptUrl ? "Next step" : "You are all set";
  const nextStepBody = input.acceptUrl
    ? "Use the secure button below to create your Mekor password and activate your online account."
    : "Your membership is active. Use the button below any time you want to sign in and access your member account.";

  await sendSendGridEmail({
    to: input.toEmail,
    subject: "[Mekor] Welcome to Mekor Habracha",
    text: [
      `Shalom ${firstName},`,
      "",
      "Your membership application has been approved.",
      `Membership type: ${input.membershipLabel}`,
      "",
      input.acceptUrl
        ? `Use this secure link to finish setting up your Mekor account: ${input.acceptUrl}`
        : `You can sign in here to access your Mekor member account: ${input.loginUrl}`,
      "",
      "We are glad to welcome you to the Mekor Habracha community.",
    ].join("\n"),
    html: `
      <div style="background:#f3eee3;padding:36px 16px;font-family:Georgia,serif;color:#1d2e40;">
        <div style="max-width:640px;margin:0 auto;">
          <div style="margin:0 0 12px;color:#6f7f91;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;text-align:center;">
            Mekor Habracha Center City Synagogue
          </div>
          <div style="background:#fffdf8;border:1px solid #dfd3bf;border-radius:30px;overflow:hidden;box-shadow:0 24px 52px rgba(24,36,50,0.12);">
            <div style="padding:34px 36px 28px;background:
              radial-gradient(84% 120% at 0% 0%, rgba(235,220,188,0.28) 0%, rgba(235,220,188,0) 52%),
              linear-gradient(135deg,#16324f 0%,#315a86 56%,#c69757 100%);
              color:#fff8ec;">
              <div style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;opacity:0.88;">Membership approved</div>
              <h1 style="margin:14px 0 10px;font-size:38px;line-height:1.02;font-weight:600;">Welcome to Mekor</h1>
              <p style="margin:0;max-width:30rem;font-size:17px;line-height:1.65;color:rgba(255,248,236,0.92);">
                Your application has been approved, and we are glad to welcome you into the Mekor Habracha community.
              </p>
            </div>
            <div style="padding:32px 36px 36px;font-family:Arial,sans-serif;line-height:1.7;color:#25384c;">
              <p style="margin:0 0 14px;font-size:17px;">Shalom ${safeFirstName},</p>
              <p style="margin:0 0 20px;font-size:16px;">
                Thank you for joining Mekor Habracha. We have recorded your membership and prepared your next step below.
              </p>

              <div style="margin:0 0 22px;padding:18px 20px;border:1px solid #d6e0ea;border-radius:20px;background:linear-gradient(180deg,#f9fbfd 0%,#f4f7fa 100%);">
                <div style="margin:0 0 6px;color:#6c7d8f;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;">Membership</div>
                <div style="font-size:22px;line-height:1.2;font-family:Georgia,serif;color:#1d3044;">${safeMembershipLabel}</div>
              </div>

              <div style="margin:0 0 22px;padding:20px 22px;border-radius:22px;background:#f7f1e5;border:1px solid #e1d4bd;">
                <div style="margin:0 0 6px;color:#6a5532;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;">${nextStepTitle}</div>
                <p style="margin:0;font-size:15px;line-height:1.7;color:#3b4b5c;">
                  ${nextStepBody}
                </p>
              </div>

              <p style="margin:26px 0 18px;">
                <a href="${primaryUrl}" style="display:inline-block;padding:15px 24px;border-radius:999px;background:#1d4f7a;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 12px 24px rgba(17,39,63,0.16);">
                  ${primaryLabel}
                </a>
              </p>

              <div style="margin:0 0 20px;padding:0 0 0 16px;border-left:3px solid #c69757;color:#556577;">
                <p style="margin:0 0 6px;font-size:14px;"><strong style="color:#25384c;">Need help with dues or account access?</strong></p>
                <p style="margin:0;font-size:14px;line-height:1.7;">
                  Reply to this email or contact the shul office and someone will follow up directly.
                </p>
              </div>

              <p style="margin:0 0 10px;font-size:14px;color:#607284;">If the button does not open, use this link:</p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.7;word-break:break-word;">
                <a href="${primaryUrl}" style="color:#1d4f7a;">${primaryUrl}</a>
              </p>

              <div style="padding-top:18px;border-top:1px solid #e7ddd0;color:#6a7a8a;font-size:13px;line-height:1.7;">
                Mekor Habracha Center City Synagogue<br />
                1500 Walnut St, Suite 206, Philadelphia, PA 19102<br />
                <a href="mailto:admin@mekorhabracha.org" style="color:#1d4f7a;">admin@mekorhabracha.org</a> ·
                <a href="tel:+12155254246" style="color:#1d4f7a;text-decoration:none;"> (215) 525-4246</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
  });
}
