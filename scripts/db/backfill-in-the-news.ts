import { config as loadEnv } from "dotenv";
import { getDb } from "@/db/client";
import { inTheNews } from "@/db/schema";
import { loadExtractedInTheNews } from "@/lib/in-the-news/extract";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env", override: false });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const rows = await loadExtractedInTheNews();
  const db = getDb();

  for (const row of rows) {
    await db
      .insert(inTheNews)
      .values({
        slug: row.slug,
        path: row.path,
        title: row.title,
        publishedLabel: row.publishedLabel,
        publishedAt: row.publishedAt,
        year: row.year,
        author: row.author,
        publication: row.publication,
        excerpt: row.excerpt,
        bodyText: row.bodyText,
        sourceUrl: row.sourceUrl,
        sourceCapturedAt: row.capturedAt ? new Date(row.capturedAt) : null,
        sourceType: "native_content",
        sourceJson: row.sourceJson,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: inTheNews.path,
        set: {
          slug: row.slug,
          title: row.title,
          publishedLabel: row.publishedLabel,
          publishedAt: row.publishedAt,
          year: row.year,
          author: row.author,
          publication: row.publication,
          excerpt: row.excerpt,
          bodyText: row.bodyText,
          sourceUrl: row.sourceUrl,
          sourceCapturedAt: row.capturedAt ? new Date(row.capturedAt) : null,
          sourceType: "native_content",
          sourceJson: row.sourceJson,
          updatedAt: new Date(),
        },
      });
  }

  console.log("Backfilled in-the-news:", rows.length);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
