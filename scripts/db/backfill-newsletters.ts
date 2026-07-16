import { config as loadEnv } from "dotenv";

import { getDb } from "@/db/client";
import { newsletterIssues } from "@/db/schema";
import { NEWSLETTERS } from "@/lib/newsletters/data";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env", override: false });

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  for (const issue of NEWSLETTERS) {
    const publishedAt = new Date(`${issue.sentOn}T12:00:00.000Z`);
    await getDb()
      .insert(newsletterIssues)
      .values({
        slug: issue.slug,
        title: issue.title,
        subject: issue.title,
        category: issue.category,
        previewText: issue.preview,
        coverImage: issue.coverImage ?? "",
        readingMinutes: issue.readingMinutes,
        searchText: issue.searchText,
        contentJson: issue as unknown as Record<string, unknown>,
        source: "mailchimp_import",
        externalCampaignId: issue.campaignId,
        publishedAt,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: newsletterIssues.slug,
        set: {
          title: issue.title,
          category: issue.category,
          previewText: issue.preview,
          coverImage: issue.coverImage ?? "",
          readingMinutes: issue.readingMinutes,
          searchText: issue.searchText,
          contentJson: issue as unknown as Record<string, unknown>,
          externalCampaignId: issue.campaignId,
          publishedAt,
          updatedAt: new Date(),
        },
      });
  }
  console.log(`Backfilled ${NEWSLETTERS.length} newsletter issues`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
