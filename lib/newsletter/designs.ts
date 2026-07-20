export const NEWSLETTER_DESIGN_PRESETS = ["classic", "modern", "celebration"] as const;
export type NewsletterDesignPreset = (typeof NEWSLETTER_DESIGN_PRESETS)[number];

export type NewsletterDesignInput = {
  preset: NewsletterDesignPreset;
  title: string;
  subtitle: string;
  intro: string;
  primarySectionTitle: string;
  primarySectionBody: string;
  secondarySectionTitle: string;
  secondarySectionBody: string;
  footer: string;
};

function esc(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function p(text: string) {
  if (!text.trim()) return "";
  return text
    .split("\n")
    .map((line) => `<p style="margin:0 0 12px;line-height:1.55;">${esc(line)}</p>`)
    .join("");
}

function sectionCard(title: string, body: string, options: { titleColor: string; border: string; background: string }) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${options.border};border-radius:12px;background:${options.background};overflow:hidden;">
  <tr><td style="height:4px;line-height:4px;font-size:0;background:linear-gradient(90deg,#214e79,#b58646);">&nbsp;</td></tr>
  <tr>
    <td style="padding:16px 16px 14px;">
      <h2 style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:20px;line-height:1.25;color:${options.titleColor};">${esc(title)}</h2>
      ${p(body)}
    </td>
  </tr>
</table>`;
}

export function generateNewsletterHtml(input: NewsletterDesignInput) {
  if (input.preset === "celebration") {
    return `<div style="max-width:640px;margin:0 auto;background:#fffdf9;border:1px solid #f1dbc0;border-radius:18px;font-family:Arial,Helvetica,sans-serif;color:#3d2d1e;overflow:hidden;">
  <div style="padding:28px 22px;background:linear-gradient(135deg,#9a5a1d,#d7924f);color:#fff7e8;text-align:center;">
    <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;font-weight:700;opacity:0.9;">Mekor Habracha</p>
    <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.15;">${esc(input.title)}</h1>
    <p style="margin:10px 0 0;font-size:15px;opacity:0.95;">${esc(input.subtitle)}</p>
  </div>
  <div style="padding:22px;">
    ${p(input.intro)}
    <div style="height:10px;"></div>
    ${sectionCard(input.primarySectionTitle, input.primarySectionBody, {
      titleColor: "#8f4b11",
      border: "#f2ddc5",
      background: "#ffffff",
    })}
    <div style="height:12px;"></div>
    ${sectionCard(input.secondarySectionTitle, input.secondarySectionBody, {
      titleColor: "#8f4b11",
      border: "#f2ddc5",
      background: "#ffffff",
    })}
    <p style="margin:18px 0 0;color:#6b4d30;font-size:13px;line-height:1.55;">${esc(input.footer)}</p>
  </div>
</div>`;
  }

  if (input.preset === "modern") {
    return `<div style="max-width:640px;margin:0 auto;background:#f7fbff;border:1px solid #dce8f4;border-radius:18px;font-family:Inter,Arial,Helvetica,sans-serif;color:#1d2b3a;overflow:hidden;">
  <div style="padding:26px 22px;background:linear-gradient(145deg,#183753,#2d6fa8);color:#f2f8ff;">
    <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;font-weight:700;opacity:0.85;">Center City Synagogue</p>
    <h1 style="margin:0;font-size:30px;line-height:1.18;">${esc(input.title)}</h1>
    <p style="margin:10px 0 0;font-size:15px;opacity:0.95;">${esc(input.subtitle)}</p>
  </div>
  <div style="padding:22px;">
    ${p(input.intro)}
    <div style="height:10px;"></div>
    ${sectionCard(input.primarySectionTitle, input.primarySectionBody, {
      titleColor: "#1e4f79",
      border: "#d7e3f0",
      background: "#ffffff",
    })}
    <div style="height:12px;"></div>
    ${sectionCard(input.secondarySectionTitle, input.secondarySectionBody, {
      titleColor: "#1e4f79",
      border: "#d7e3f0",
      background: "#ffffff",
    })}
    <p style="margin:18px 0 0;color:#4a5d70;font-size:13px;line-height:1.55;">${esc(input.footer)}</p>
  </div>
</div>`;
  }

  return `<div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e0d3bf;border-radius:18px;font-family:Georgia,'Times New Roman',serif;color:#1f2f40;overflow:hidden;">
  <div style="padding:26px 22px;background:linear-gradient(180deg,#f8f3eb 0%,#eef4fb 100%);text-align:center;">
    <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#8a6428;font-weight:700;">Mekor Habracha</p>
    <h1 style="margin:0;font-size:30px;line-height:1.18;color:#1f4467;">${esc(input.title)}</h1>
    <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#3f5d79;">${esc(input.subtitle)}</p>
  </div>
  <div style="padding:22px;">
    ${p(input.intro)}
    <div style="height:10px;"></div>
    ${sectionCard(input.primarySectionTitle, input.primarySectionBody, {
      titleColor: "#1f4467",
      border: "#d7e3f0",
      background: "#ffffff",
    })}
    <div style="height:12px;"></div>
    ${sectionCard(input.secondarySectionTitle, input.secondarySectionBody, {
      titleColor: "#1f4467",
      border: "#d7e3f0",
      background: "#ffffff",
    })}
    <p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;color:#4d6074;font-size:13px;line-height:1.55;">${esc(input.footer)}</p>
  </div>
</div>`;
}
