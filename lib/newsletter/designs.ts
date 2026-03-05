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
    .map((line) => `<p style="margin:0 0 12px;">${esc(line)}</p>`)
    .join("");
}

export function generateNewsletterHtml(input: NewsletterDesignInput) {
  if (input.preset === "celebration") {
    return `<div style="max-width:640px;margin:0 auto;background:#fffdf9;border:1px solid #f1dbc0;border-radius:16px;font-family:Arial,Helvetica,sans-serif;color:#3d2d1e;overflow:hidden;">
  <div style="padding:26px 22px;background:linear-gradient(135deg,#b46f2c,#d7924f);color:#fff7e8;">
    <h1 style="margin:0;font-size:30px;line-height:1.2;">${esc(input.title)}</h1>
    <p style="margin:8px 0 0;font-size:15px;opacity:0.95;">${esc(input.subtitle)}</p>
  </div>
  <div style="padding:22px;">
    ${p(input.intro)}
    <div style="border:1px solid #f2ddc5;border-radius:10px;padding:14px;background:#fff;">
      <h2 style="margin:0 0 8px;color:#8f4b11;font-size:20px;">${esc(input.primarySectionTitle)}</h2>
      ${p(input.primarySectionBody)}
    </div>
    <div style="height:12px;"></div>
    <div style="border:1px solid #f2ddc5;border-radius:10px;padding:14px;background:#fff;">
      <h2 style="margin:0 0 8px;color:#8f4b11;font-size:20px;">${esc(input.secondarySectionTitle)}</h2>
      ${p(input.secondarySectionBody)}
    </div>
    <p style="margin:18px 0 0;color:#6b4d30;font-size:13px;">${esc(input.footer)}</p>
  </div>
</div>`;
  }

  if (input.preset === "modern") {
    return `<div style="max-width:640px;margin:0 auto;background:#f7fbff;border:1px solid #dce8f4;border-radius:16px;font-family:Inter,Arial,Helvetica,sans-serif;color:#1d2b3a;overflow:hidden;">
  <div style="padding:24px 22px;background:linear-gradient(145deg,#1c4f7a,#2d6fa8);color:#f2f8ff;">
    <h1 style="margin:0;font-size:30px;line-height:1.2;">${esc(input.title)}</h1>
    <p style="margin:8px 0 0;font-size:15px;opacity:0.95;">${esc(input.subtitle)}</p>
  </div>
  <div style="padding:22px;">
    ${p(input.intro)}
    <h2 style="margin:14px 0 8px;color:#1e4f79;font-size:20px;">${esc(input.primarySectionTitle)}</h2>
    ${p(input.primarySectionBody)}
    <h2 style="margin:18px 0 8px;color:#1e4f79;font-size:20px;">${esc(input.secondarySectionTitle)}</h2>
    ${p(input.secondarySectionBody)}
    <p style="margin:18px 0 0;color:#4a5d70;font-size:13px;">${esc(input.footer)}</p>
  </div>
</div>`;
  }

  return `<div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #d9e3ef;border-radius:16px;font-family:Georgia,'Times New Roman',serif;color:#1f2f40;overflow:hidden;">
  <div style="padding:24px 22px;background:#eef4fb;">
    <h1 style="margin:0;font-size:30px;line-height:1.2;color:#1f4467;">${esc(input.title)}</h1>
    <p style="margin:8px 0 0;font-size:15px;color:#3f5d79;">${esc(input.subtitle)}</p>
  </div>
  <div style="padding:22px;">
    ${p(input.intro)}
    <h2 style="margin:16px 0 8px;color:#1f4467;font-size:21px;">${esc(input.primarySectionTitle)}</h2>
    ${p(input.primarySectionBody)}
    <h2 style="margin:16px 0 8px;color:#1f4467;font-size:21px;">${esc(input.secondarySectionTitle)}</h2>
    ${p(input.secondarySectionBody)}
    <p style="margin:20px 0 0;color:#4d6074;font-size:13px;">${esc(input.footer)}</p>
  </div>
</div>`;
}
