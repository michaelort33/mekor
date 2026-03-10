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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function firstNameFromFullName(name: string) {
  const first = name.trim().split(/\s+/)[0];
  return first || "there";
}

function formatFormLabel(formType: string) {
  switch (formType) {
    case "contact":
      return "Contact Request";
    case "volunteer":
      return "Volunteer Request";
    case "kosher-inquiry":
      return "Kosher Update";
    case "davening-rsvp":
      return "Davening Request";
    case "auxiliary-membership":
      return "Auxiliary Membership Request";
    case "kiddush-sponsorship":
      return "Kiddush Sponsorship Request";
    default:
      return "Submission";
  }
}

function buildConfirmationCopy(formType: string) {
  switch (formType) {
    case "contact":
      return {
        heading: "We received your message",
        body: "A member of the Mekor team will review your message and follow up as needed.",
        nextSteps: "If your question is time-sensitive, you can reply to this email or call the shul office directly.",
      };
    case "volunteer":
      return {
        heading: "Thank you for volunteering",
        body: "We received your volunteer submission and will follow up with the next step for the opportunity you selected.",
        nextSteps: "If your availability changes before we respond, reply to this email and we will update your request.",
      };
    case "kosher-inquiry":
      return {
        heading: "Thank you for the kosher update",
        body: "We received your correction or listing request and will review it with the local kashrut directory workflow.",
        nextSteps: "If you have additional details, links, or certifying-agency information, reply to this email so it stays attached to your submission.",
      };
    case "davening-rsvp":
      return {
        heading: "Your davening request was received",
        body: "We received your RSVP or participation request and will follow up if confirmation or coordination is needed.",
        nextSteps: "For urgent same-day minyan coordination, you can also use the relevant WhatsApp group or call the shul office.",
      };
    case "auxiliary-membership":
      return {
        heading: "Your membership request was received",
        body: "We received your auxiliary or alumni membership request and will follow up regarding the next step and payment coordination.",
        nextSteps: "If you need to discuss rates, payment timing, or your status as an alumnus, reply to this email and the team will continue the conversation there.",
      };
    case "kiddush-sponsorship":
      return {
        heading: "Your kiddush sponsorship request was received",
        body: "We received your sponsorship request and will follow up to confirm availability, dedication wording, and payment details.",
        nextSteps: "If you need to lock in a specific date quickly, reply to this email or call the shul office so the office can prioritize it.",
      };
    default:
      return {
        heading: "We received your submission",
        body: "A member of the Mekor team will review it and follow up if needed.",
        nextSteps: "Reply to this email if you need to add context.",
      };
  }
}

function buildMessagePreview(message: string) {
  const preview = message.trim();
  return preview.length > 900 ? `${preview.slice(0, 897)}...` : preview;
}

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
    replyTo: payload.email,
    subject: `[Mekor] ${payload.formType} form submission`,
    text,
  });
}

export async function sendFormConfirmation(payload: FormEmailPayload) {
  const resend = new Resend(getResendApiKey());
  const firstName = firstNameFromFullName(payload.name);
  const safeFirstName = escapeHtml(firstName);
  const safeName = escapeHtml(payload.name);
  const safeFormLabel = escapeHtml(formatFormLabel(payload.formType));
  const safeSourcePath = escapeHtml(payload.sourcePath || "/");
  const safePreview = escapeHtml(buildMessagePreview(payload.message));
  const copy = buildConfirmationCopy(payload.formType);
  const safeHeading = escapeHtml(copy.heading);
  const safeBody = escapeHtml(copy.body);
  const safeNextSteps = escapeHtml(copy.nextSteps);

  await resend.emails.send({
    from: getFormNotifyFrom(),
    to: [payload.email],
    replyTo: getFormNotifyTo(),
    subject: `[Mekor] ${formatFormLabel(payload.formType)} received`,
    text: [
      `Shalom ${firstName},`,
      "",
      copy.body,
      "",
      `Submission type: ${formatFormLabel(payload.formType)}`,
      `Reference number: #${payload.submissionId}`,
      `Submitted from: ${payload.sourcePath || "/"}`,
      "",
      "Your submission summary:",
      buildMessagePreview(payload.message),
      "",
      copy.nextSteps,
      "",
      "Mekor Habracha Center City Synagogue",
      "1500 Walnut St, Suite 206, Philadelphia, PA 19102",
      "admin@mekorhabracha.org",
      "(215) 525-4246",
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
              <div style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;opacity:0.88;">Submission received</div>
              <h1 style="margin:14px 0 10px;font-size:38px;line-height:1.02;font-weight:600;">${safeHeading}</h1>
              <p style="margin:0;max-width:31rem;font-size:17px;line-height:1.65;color:rgba(255,248,236,0.92);">
                ${safeBody}
              </p>
            </div>
            <div style="padding:32px 36px 36px;font-family:Arial,sans-serif;line-height:1.7;color:#25384c;">
              <p style="margin:0 0 14px;font-size:17px;">Shalom ${safeFirstName},</p>
              <p style="margin:0 0 20px;font-size:16px;">
                Thank you for reaching out to Mekor. We recorded your submission and attached the details below for your records.
              </p>

              <div style="margin:0 0 22px;padding:18px 20px;border:1px solid #d6e0ea;border-radius:20px;background:linear-gradient(180deg,#f9fbfd 0%,#f4f7fa 100%);">
                <div style="margin:0 0 6px;color:#6c7d8f;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;">Submission</div>
                <div style="font-size:22px;line-height:1.2;font-family:Georgia,serif;color:#1d3044;">${safeFormLabel}</div>
                <div style="margin-top:10px;font-size:14px;color:#5b6d7e;">
                  Reference number <strong>#${payload.submissionId}</strong><br />
                  Submitted from <strong>${safeSourcePath}</strong><br />
                  Submitted by <strong>${safeName}</strong>
                </div>
              </div>

              <div style="margin:0 0 22px;padding:20px 22px;border-radius:22px;background:#f7f1e5;border:1px solid #e1d4bd;">
                <div style="margin:0 0 6px;color:#6a5532;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;">What happens next</div>
                <p style="margin:0;font-size:15px;line-height:1.7;color:#3b4b5c;">
                  ${safeNextSteps}
                </p>
              </div>

              <div style="margin:0 0 22px;padding:20px 22px;border-radius:22px;border:1px solid #dfe6ee;background:#fcfdff;">
                <div style="margin:0 0 8px;color:#6c7d8f;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;">Your submission summary</div>
                <pre style="margin:0;white-space:pre-wrap;word-break:break-word;font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#2e4155;">${safePreview}</pre>
              </div>

              <div style="margin:0 0 20px;padding:0 0 0 16px;border-left:3px solid #c69757;color:#556577;">
                <p style="margin:0 0 6px;font-size:14px;"><strong style="color:#25384c;">Need to add context?</strong></p>
                <p style="margin:0;font-size:14px;line-height:1.7;">
                  Reply to this email and the Mekor team will receive your follow-up directly.
                </p>
              </div>

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
