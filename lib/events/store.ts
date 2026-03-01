import { asc, desc } from "drizzle-orm";

import { getDb } from "@/db/client";
import { events } from "@/db/schema";
import { loadExtractedEvents, type ExtractedEvent } from "@/lib/events/extract";

export type ManagedEvent = {
  slug: string;
  path: string;
  title: string;
  shortDate: string;
  location: string;
  timeLabel: string;
  startAt: string | null;
  endAt: string | null;
  isClosed: boolean;
};

function toManagedEvent(row: {
  slug: string;
  path: string;
  title: string;
  shortDate: string;
  location: string;
  timeLabel: string;
  startAt: Date | null;
  endAt: Date | null;
  isClosed: boolean;
}): ManagedEvent {
  return {
    slug: row.slug,
    path: row.path,
    title: row.title,
    shortDate: row.shortDate,
    location: row.location,
    timeLabel: row.timeLabel,
    startAt: row.startAt ? row.startAt.toISOString() : null,
    endAt: row.endAt ? row.endAt.toISOString() : null,
    isClosed: row.isClosed,
  };
}

async function syncExtractedEventsToDb(rows: ExtractedEvent[]) {
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
        sourceType: "mirror",
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
          sourceType: "mirror",
          sourceJson: row.sourceJson,
          updatedAt: new Date(),
        },
      });
  }
}

export async function getManagedEvents() {
  const extracted = await loadExtractedEvents();

  if (!process.env.DATABASE_URL) {
    return extracted.map((row) =>
      toManagedEvent({
        ...row,
      }),
    );
  }

  try {
    await syncExtractedEventsToDb(extracted);

    const rows = await getDb()
      .select({
        slug: events.slug,
        path: events.path,
        title: events.title,
        shortDate: events.shortDate,
        location: events.location,
        timeLabel: events.timeLabel,
        startAt: events.startAt,
        endAt: events.endAt,
        isClosed: events.isClosed,
      })
      .from(events)
      .orderBy(asc(events.startAt), desc(events.updatedAt));

    return rows.map((row) => toManagedEvent(row));
  } catch {
    return extracted.map((row) =>
      toManagedEvent({
        ...row,
      }),
    );
  }
}
