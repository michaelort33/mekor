import { config as loadEnv } from "dotenv";
import { getDb } from "@/db/client";
import { events } from "@/db/schema";
import { loadExtractedEvents } from "@/lib/events/extract";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env", override: false });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const rows = await loadExtractedEvents();
  const db = getDb();

  for (const row of rows) {
    await db
      .insert(events)
      .values({
        slug: row.slug,
        path: row.path,
        title: row.title,
        shortDate: row.shortDate,
        location: row.location,
        timeLabel: row.timeLabel,
        startAt: row.startAt,
        endAt: row.endAt,
        isClosed: row.isClosed,
        sourceCapturedAt: row.capturedAt ? new Date(row.capturedAt) : null,
        sourceType: "native_content",
        sourceJson: row.sourceJson,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: events.path,
        set: {
          slug: row.slug,
          title: row.title,
          shortDate: row.shortDate,
          location: row.location,
          timeLabel: row.timeLabel,
          startAt: row.startAt,
          endAt: row.endAt,
          isClosed: row.isClosed,
          sourceCapturedAt: row.capturedAt ? new Date(row.capturedAt) : null,
          sourceType: "native_content",
          sourceJson: row.sourceJson,
          updatedAt: new Date(),
        },
      });
  }

  console.log("Backfilled events:", rows.length);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
