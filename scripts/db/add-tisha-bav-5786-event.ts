import { config as loadEnv } from "dotenv";

import { getDb } from "@/db/client";
import { events } from "@/db/schema";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env", override: false });

const PATH = "/events-1/tisha-bav-5786";

// Flyer wall-clock times are America/New_York (EDT, UTC-4 in July). Explicit
// offsets keep the stored instants correct on any machine time zone.
const START_AT = new Date("2026-07-22T20:15:00-04:00"); // Wed Jul 22 — Mincha, 8:15pm
const END_AT = new Date("2026-07-23T20:57:00-04:00"); // Thu Jul 23 — Fast Ends, 8:57pm

const DESCRIPTION =
  "Tisha B’Av 5786 at Mekor Habracha / Center City Synagogue — Mincha, the " +
  "beginning of the fast, and Maariv with Megilat Eicha on Wednesday evening, July 22nd; " +
  "morning services, Kinnot, a class with Rabbi Hirsch, Mincha, Maariv, and the end of " +
  "the fast on Thursday, July 23rd.";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const values = {
    slug: "tisha-bav-5786",
    path: PATH,
    title: "Tisha B’Av 5786",
    shortDate: "Jul 22–23, 2026",
    location: "Mekor Habracha / Center City Synagogue",
    timeLabel: "Wed 8:15 PM – Thu 8:57 PM",
    startAt: START_AT,
    endAt: END_AT,
    isClosed: false,
    sourceCapturedAt: new Date("2026-07-20T12:00:00.000Z"),
    sourceType: "native_content",
    sourceJson: {
      // Managed-events contract requires empty or an absolute URL; no flyer
      // asset is uploaded for this event, so the detail page stays text-first.
      heroImage: "",
      description: DESCRIPTION,
      canonical: PATH,
      headings: ["Tisha B’Av 5786"],
      featured: true,
      schedule: [
        {
          dayLabel: "Wednesday, July 22nd",
          items: [
            { time: "8:15pm", label: "Mincha" },
            { time: "8:23pm", label: "Beginning of Fast" },
            { time: "8:30pm", label: "Maariv followed by Megilat Eicha" },
          ],
        },
        {
          dayLabel: "Thursday, July 23rd",
          items: [
            { time: "6:45am", label: "Morning Services" },
            { time: "~7:30am", label: "Kinnot" },
            { time: "1:06pm", label: "Midday" },
            { time: "7:00pm", label: "Class with Rabbi Hirsch" },
            { time: "8:00pm", label: "Mincha" },
            { time: "8:30pm", label: "Maariv" },
            { time: "8:57pm", label: "Fast Ends" },
          ],
        },
      ],
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
