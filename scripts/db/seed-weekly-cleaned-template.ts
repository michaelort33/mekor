/**
 * Upsert the "Weekly Newsletter - Cleaned" draft starter into newsletter_templates.
 *
 * Usage:
 *   npm run db:seed:weekly-cleaned-template
 */

import { config as loadEnv } from "dotenv";
import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { newsletterTemplates } from "@/db/schema";
import {
  buildWeeklyCleanedTemplateDraft,
  WEEKLY_CLEANED_TEMPLATE_TITLE,
} from "@/lib/newsletter/weekly-cleaned";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env", override: false });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }

  const draft = buildWeeklyCleanedTemplateDraft();
  const db = getDb();

  const [existing] = await db
    .select({ id: newsletterTemplates.id })
    .from(newsletterTemplates)
    .where(eq(newsletterTemplates.title, WEEKLY_CLEANED_TEMPLATE_TITLE))
    .limit(1);

  if (existing) {
    await db
      .update(newsletterTemplates)
      .set({
        subject: draft.subject,
        parshaName: draft.parshaName,
        shabbatDate: draft.shabbatDate,
        hebrewDate: draft.hebrewDate,
        candleLighting: draft.candleLighting,
        previewText: draft.previewText,
        category: draft.category,
        bodyHtml: draft.bodyHtml,
        status: "draft",
        updatedAt: new Date(),
      })
      .where(eq(newsletterTemplates.id, existing.id));

    console.log(`Updated template #${existing.id}: ${WEEKLY_CLEANED_TEMPLATE_TITLE}`);
    return;
  }

  const [created] = await db
    .insert(newsletterTemplates)
    .values({
      title: draft.title,
      subject: draft.subject,
      parshaName: draft.parshaName,
      shabbatDate: draft.shabbatDate,
      hebrewDate: draft.hebrewDate,
      candleLighting: draft.candleLighting,
      previewText: draft.previewText,
      category: draft.category,
      bodyHtml: draft.bodyHtml,
      status: "draft",
    })
    .returning({ id: newsletterTemplates.id });

  console.log(`Created template #${created.id}: ${WEEKLY_CLEANED_TEMPLATE_TITLE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
