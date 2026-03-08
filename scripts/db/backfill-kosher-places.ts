import "dotenv/config";

import { getDb } from "../../db/client";
import { kosherPlaces, pageFreshness } from "../../db/schema";
import { loadExtractedKosherPlaces } from "../../lib/kosher/extract";

async function main() {
  const extracted = await loadExtractedKosherPlaces();
  const db = getDb();
  const now = new Date();

  for (const row of extracted) {
    await db
      .insert(kosherPlaces)
      .values({
        slug: row.slug,
        path: row.path,
        title: row.title,
        neighborhood: row.neighborhood,
        neighborhoodLabel: row.neighborhoodLabel,
        tags: row.tags,
        categoryPaths: row.categoryPaths,
        tagPaths: row.tagPaths,
        address: row.address,
        phone: row.phone,
        website: row.website,
        supervision: row.supervision,
        summary: row.summary,
        locationHref: row.locationHref,
        sourceCapturedAt: row.capturedAt ? new Date(row.capturedAt) : null,
        sourceType: "mirror",
        sourceJson: row.sourceJson,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: kosherPlaces.path,
        set: {
          slug: row.slug,
          title: row.title,
          neighborhood: row.neighborhood,
          neighborhoodLabel: row.neighborhoodLabel,
          tags: row.tags,
          categoryPaths: row.categoryPaths,
          tagPaths: row.tagPaths,
          address: row.address,
          phone: row.phone,
          website: row.website,
          supervision: row.supervision,
          summary: row.summary,
          locationHref: row.locationHref,
          sourceCapturedAt: row.capturedAt ? new Date(row.capturedAt) : null,
          sourceType: "mirror",
          sourceJson: row.sourceJson,
          updatedAt: now,
        },
      });
  }

  const newestCapturedAt = extracted
    .map((row) => Date.parse(row.capturedAt))
    .filter((value) => !Number.isNaN(value))
    .sort((a, b) => b - a)[0];

  await db
    .insert(pageFreshness)
    .values({
      key: "center-city",
      lastUpdatedAt: newestCapturedAt ? new Date(newestCapturedAt) : now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: pageFreshness.key,
      set: {
        lastUpdatedAt: newestCapturedAt ? new Date(newestCapturedAt) : now,
        updatedAt: now,
      },
    });

  const rows = await db
    .select({
      id: kosherPlaces.id,
    })
    .from(kosherPlaces);

  console.log(
    JSON.stringify({
      extractedCount: extracted.length,
      dbCount: rows.length,
      freshnessUpdated: true,
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
