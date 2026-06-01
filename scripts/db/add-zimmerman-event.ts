import { config as loadEnv } from "dotenv";

import { getDb } from "@/db/client";
import { events } from "@/db/schema";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env", override: false });

const PATH = "/events-1/an-evening-with-yaakov-zimmerman";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const startAt = new Date(2026, 5, 17, 19, 30, 0); // Wed, Jun 17, 2026, 7:30 PM (local) — placeholder time
  const endAt = new Date(2026, 5, 17, 21, 30, 0);

  const values = {
    slug: "an-evening-with-yaakov-zimmerman",
    path: PATH,
    title: "An Evening with Yaakov Zimmerman",
    shortDate: "Jun 17, 2026",
    location: "Philadelphia",
    timeLabel: "7:30 PM",
    startAt,
    endAt,
    isClosed: false,
    sourceCapturedAt: new Date("2026-06-01T17:00:00.000Z"),
    sourceType: "native_content",
    sourceJson: {
      // Managed-events contract requires empty or an absolute URL; the hero/flyer
      // for the detail page is supplied via the generated template bundle instead.
      heroImage: "",
      description:
        "Stories from the front lines to Shiloh — with a wine tasting featuring wines from Yaakov Zimmerman’s Shiloh Winery, plus conversation and Q&A.",
      canonical: PATH,
      headings: ["An Evening with Yaakov Zimmerman"],
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

  console.log("Inserted/updated event:", PATH);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
