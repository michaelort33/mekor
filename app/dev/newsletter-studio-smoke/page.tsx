import { notFound } from "next/navigation";

import { NewsletterStudioClient } from "@/app/admin/templates/[id]/studio/studio-client";

export const dynamic = "force-dynamic";

/**
 * Local/browser smoke harness for newsletter studio.
 * Enabled only when STUDIO_SMOKE=1 so it never appears in production.
 */
export default function NewsletterStudioSmokePage() {
  if (process.env.STUDIO_SMOKE !== "1") {
    notFound();
  }

  const now = new Date("2026-07-18T12:00:00.000Z");
  const template = {
    id: 9001,
    title: "Smoke Test Newsletter",
    subject: "Shabbat Shalom — Smoke",
    parshaName: "Smoke",
    shabbatDate: "July 18, 2026",
    hebrewDate: "",
    candleLighting: "8:00pm",
    slug: "smoke-test-newsletter",
    category: "weekly",
    previewText: "Smoke preview",
    bodyHtml:
      '<table style="width:100%"><tr><td style="color:#234d78;font-family:Arial,sans-serif"><h1>Shabbat Shalom</h1><p id="intro">Welcome to Mekor Habracha.</p></td></tr></table>',
    publishOnSend: false,
    status: "draft" as const,
    sentAt: null,
    createdAt: now,
    updatedAt: now,
  };

  return <NewsletterStudioClient template={template} />;
}
