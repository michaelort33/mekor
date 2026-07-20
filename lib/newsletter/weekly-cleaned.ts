/**
 * Cleaned weekly Shabbat newsletter starter.
 *
 * Modeled on recent Mailchimp weeklies (Matot-Masei / Pinchas), but evergreen
 * blurbs (membership, Hebrew Help, wine/Judaica, volunteer pitches, Israel
 * support, donations) are collapsed to short links pointing at the bulletin
 * board and related site pages.
 *
 * Visual craft (logo + Shabbat banner + styled board CTA) is restored while
 * keeping the weekly copy lean.
 */

export const WEEKLY_CLEANED_TEMPLATE_TITLE = "Weekly Newsletter - Cleaned";

export const WEEKLY_CLEANED_BULLETIN_URL = "https://www.mekorhabracha.org/mekor-bulletin-board";
export const WEEKLY_CLEANED_SITE_URL = "https://www.mekorhabracha.org";

/** Public absolute URLs so email clients can load local archive assets. */
export const WEEKLY_CLEANED_LOGO_URL = `${WEEKLY_CLEANED_SITE_URL}/newsletters/archive/assets/238810f8b9cd-75d082cb-45f0-420c-95dd-3f153937e7ef.png`;
export const WEEKLY_CLEANED_SHABBAT_BANNER_URL = `${WEEKLY_CLEANED_SITE_URL}/newsletters/archive/assets/01b4787397a5-210e849f-0dff-f50d-8135-5cfaa09eb671.png`;

export type WeeklyCleanedInput = {
  parshaName?: string;
  shabbatDate?: string;
  hebrewDate?: string;
  candleLighting?: string;
  fridayLabel?: string;
  shabbatLabel?: string;
  fridaySchedule?: string;
  shabbatSchedule?: string;
  eruvStatus?: string;
  kiddushHtml?: string;
  thisWeekHtml?: string;
  weekdayServicesHtml?: string;
};

const DEFAULTS = {
  parshaName: "Parshat [Parsha Name]",
  shabbatDate: "[English dates]",
  hebrewDate: "[Hebrew date]",
  candleLighting: "[Candle lighting]",
  fridayLabel: "Friday",
  shabbatLabel: "Shabbat",
  fridaySchedule: "7:00pm Mincha / Kabbalat Shabbat / Maariv",
  shabbatSchedule:
    "9:15am Morning Services · 10:00am Torah Reading · ~11:30am Kiddush · 7:00pm Pre-Mincha Classes · 8:00pm Mincha / Third Meal / Maariv · [Havdalah]",
  eruvStatus: "The Center City Eruv is UP!",
  kiddushHtml: `<p style="margin:0 0 10px;line-height:1.55;">This week's Kiddush is sponsored by <strong>[Sponsor names]</strong> in honor of <strong>[occasion]</strong>.</p>
<p style="margin:0;line-height:1.55;color:#526579;">Add or remove sponsor notes here. Omit this section when there is no sponsorship to announce.</p>`,
  thisWeekHtml: `<p style="margin:0 0 10px;line-height:1.55;"><strong>[Announcement title]</strong> — one or two sentences about what is new this week only.</p>
<p style="margin:0;line-height:1.55;color:#526579;">Keep this section for time-sensitive items. Standing programs belong on the <a href="${WEEKLY_CLEANED_BULLETIN_URL}" style="color:#1f4f81;font-weight:700;">Bulletin Board</a>.</p>`,
  weekdayServicesHtml: `<p style="margin:0 0 8px;line-height:1.55;"><strong>Sunday–Friday</strong> — see the full weekday schedule and RSVP notes on the <a href="${WEEKLY_CLEANED_SITE_URL}/davening" style="color:#1f4f81;font-weight:700;">Davening page</a>.</p>
<p style="margin:0;line-height:1.55;color:#526579;">Optional: paste this week's day-by-day times here when they change.</p>`,
} as const;

function esc(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function resolve(input: WeeklyCleanedInput) {
  return {
    parshaName: input.parshaName?.trim() || DEFAULTS.parshaName,
    shabbatDate: input.shabbatDate?.trim() || DEFAULTS.shabbatDate,
    hebrewDate: input.hebrewDate?.trim() || DEFAULTS.hebrewDate,
    candleLighting: input.candleLighting?.trim() || DEFAULTS.candleLighting,
    fridayLabel: input.fridayLabel?.trim() || DEFAULTS.fridayLabel,
    shabbatLabel: input.shabbatLabel?.trim() || DEFAULTS.shabbatLabel,
    fridaySchedule: input.fridaySchedule?.trim() || DEFAULTS.fridaySchedule,
    shabbatSchedule: input.shabbatSchedule?.trim() || DEFAULTS.shabbatSchedule,
    eruvStatus: input.eruvStatus?.trim() || DEFAULTS.eruvStatus,
    kiddushHtml: input.kiddushHtml?.trim() || DEFAULTS.kiddushHtml,
    thisWeekHtml: input.thisWeekHtml?.trim() || DEFAULTS.thisWeekHtml,
    weekdayServicesHtml: input.weekdayServicesHtml?.trim() || DEFAULTS.weekdayServicesHtml,
  };
}

function section(title: string, bodyHtml: string) {
  return `<tr>
  <td style="padding:0 0 18px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d7e3f0;border-radius:14px;background:#ffffff;overflow:hidden;">
      <tr>
        <td style="height:4px;line-height:4px;font-size:0;background:linear-gradient(90deg,#214e79,#b58646);">&nbsp;</td>
      </tr>
      <tr>
        <td style="padding:18px 20px;">
          <h2 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:20px;line-height:1.25;color:#1f4467;">${esc(title)}</h2>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#24384d;">${bodyHtml}</div>
        </td>
      </tr>
    </table>
  </td>
</tr>`;
}

/**
 * Email-safe weekly starter HTML. Placeholders in brackets are meant to be
 * replaced each week in Studio / AI edit.
 */
export function generateWeeklyCleanedHtml(input: WeeklyCleanedInput = {}) {
  const values = resolve(input);

  return `<div style="margin:0;padding:0;background:#f4efe6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe6;">
    <tr>
      <td align="center" style="padding:20px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #e0d3bf;border-radius:18px;overflow:hidden;">
          <tr>
            <td style="padding:22px 22px 10px;background:linear-gradient(180deg,#f8f3eb 0%,#ffffff 100%);text-align:center;">
              <img src="${WEEKLY_CLEANED_LOGO_URL}" alt="Mekor Habracha - Center City Synagogue" width="280" style="display:block;margin:0 auto 14px;width:280px;max-width:80%;height:auto;border:0;" />
              <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#8a6428;font-weight:700;">Mekor Habracha Weekly Newsletter</p>
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.18;color:#1f4467;">${esc(values.parshaName)}</h1>
              <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.45;color:#3f5d79;">${esc(values.shabbatDate)} · ${esc(values.hebrewDate)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0;">
              <img src="${WEEKLY_CLEANED_SHABBAT_BANNER_URL}" alt="Shabbat at Mekor" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:22px 20px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${section(
                  "Shabbat Schedule",
                  `<p style="margin:0 0 10px;line-height:1.55;"><strong>${esc(values.fridayLabel)}</strong><br>${esc(values.fridaySchedule)}<br>Candle Lighting: <strong>${esc(values.candleLighting)}</strong></p>
<p style="margin:0 0 10px;line-height:1.55;"><strong>${esc(values.shabbatLabel)}</strong><br>${esc(values.shabbatSchedule)}</p>
<p style="margin:0 0 10px;line-height:1.55;"><strong>${esc(values.eruvStatus)}</strong> Help keep the Eruv strong — details and volunteer sign-up are on the <a href="${WEEKLY_CLEANED_BULLETIN_URL}" style="color:#1f4f81;font-weight:700;">Bulletin Board</a>.</p>
<p style="margin:0;line-height:1.55;color:#526579;">For zmanim, sponsorships, Mishebeirach requests, and programming, visit <a href="${WEEKLY_CLEANED_SITE_URL}" style="color:#1f4f81;font-weight:700;">mekorhabracha.org</a>.</p>`,
                )}
                ${section("Kiddush / Sponsors This Week", values.kiddushHtml)}
                ${section("This Week at Mekor", values.thisWeekHtml)}
                ${section("Weekday Services", values.weekdayServicesHtml)}
                ${section(
                  "Community Bulletin Board",
                  `<p style="margin:0 0 12px;line-height:1.55;">Ongoing programs and community resources are always on the <strong>Mekor Bulletin Board</strong>:</p>
<ul style="margin:0 0 16px;padding-left:18px;line-height:1.6;">
  <li>Tot Shabbat &amp; family programming</li>
  <li>Membership, Hebrew Help, and volunteering</li>
  <li>Kosher wine &amp; Judaica affiliate links</li>
  <li>Eruv support, Israel initiatives, and ongoing notices</li>
</ul>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e0d3bf;border-radius:14px;background:linear-gradient(135deg,#f8f3eb,#eef4fb);">
  <tr>
    <td style="padding:18px 18px;text-align:center;">
      <p style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.3;color:#1f4467;">Browse the community board</p>
      <a href="${WEEKLY_CLEANED_BULLETIN_URL}" style="display:inline-block;background:#214e79;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;padding:13px 20px;border-radius:999px;">Open the Bulletin Board</a>
    </td>
  </tr>
</table>`,
                )}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 24px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:#526579;text-align:center;">
              <p style="margin:0 0 8px;">
                <a href="${WEEKLY_CLEANED_SITE_URL}/membership" style="color:#1f4f81;font-weight:700;text-decoration:none;">Membership</a>
                &nbsp;·&nbsp;
                <a href="${WEEKLY_CLEANED_SITE_URL}/donations" style="color:#1f4f81;font-weight:700;text-decoration:none;">Donate</a>
                &nbsp;·&nbsp;
                <a href="${WEEKLY_CLEANED_SITE_URL}/davening" style="color:#1f4f81;font-weight:700;text-decoration:none;">Davening</a>
                &nbsp;·&nbsp;
                <a href="${WEEKLY_CLEANED_BULLETIN_URL}" style="color:#1f4f81;font-weight:700;text-decoration:none;">Bulletin Board</a>
              </p>
              <p style="margin:0;">Mekor Habracha / Center City Synagogue<br>1500 Walnut St. Suite 206, Philadelphia, PA 19102</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>`;
}

export function buildWeeklyCleanedTemplateDraft(input: WeeklyCleanedInput = {}) {
  const values = resolve(input);
  const parsha = values.parshaName.replace(/^Parshat\s+/i, "").trim() || "Weekly";

  return {
    title: WEEKLY_CLEANED_TEMPLATE_TITLE,
    subject: `Mekor Habracha Newsletter - ${parsha}`,
    parshaName: values.parshaName.replace(/^Parshat\s+/i, "").trim(),
    shabbatDate: values.shabbatDate === DEFAULTS.shabbatDate ? "" : values.shabbatDate,
    hebrewDate: values.hebrewDate === DEFAULTS.hebrewDate ? "" : values.hebrewDate,
    candleLighting:
      values.candleLighting === DEFAULTS.candleLighting ? "" : values.candleLighting,
    previewText: "Shabbat Shalom from Mekor!",
    category: "weekly" as const,
    bodyHtml: generateWeeklyCleanedHtml(input),
    status: "draft" as const,
  };
}
