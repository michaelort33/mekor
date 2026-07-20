import { config as loadEnv } from "dotenv";

import { getDb } from "@/db/client";
import { events } from "@/db/schema";
import { TISHA_BAV_5786_EVENT } from "@/lib/events/tisha-bav-5786";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env", override: false });

const event = TISHA_BAV_5786_EVENT;

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const values = {
    slug: event.slug,
    path: event.path,
    title: event.title,
    shortDate: event.shortDate,
    location: event.location,
    timeLabel: event.timeLabel,
    // Explicit offsets preserve the flyer wall-clock times on every machine.
    startAt: new Date(event.startAt),
    endAt: new Date(event.endAt),
    isClosed: false,
    sourceCapturedAt: new Date(event.capturedAt),
    sourceType: "native_content",
    sourceJson: {
      // Managed-events contract requires empty or an absolute URL; no flyer
      // asset is uploaded for this event, so the detail page stays text-first.
      heroImage: "",
      description: event.description,
      canonical: event.path,
      headings: [event.title],
      featured: event.featured,
      schedule: event.schedule,
    } as Record<string, unknown>,
    updatedAt: new Date(),
  };

  await getDb()
    .insert(events)
    .values(values)
    .onConflictDoUpdate({
      target: events.path,
      set: {
        slug: values.slug,
        title: values.title,
        shortDate: values.shortDate,
        location: values.location,
        timeLabel: values.timeLabel,
        startAt: values.startAt,
        endAt: values.endAt,
        isClosed: values.isClosed,
        sourceCapturedAt: values.sourceCapturedAt,
        sourceType: values.sourceType,
        sourceJson: values.sourceJson,
        updatedAt: new Date(),
      },
    });

  console.log("Inserted/updated event:", event.path);
}

main()
  .then(() => {
    // The shared db client keeps its pool open; exit explicitly so the
    // one-shot script terminates.
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
