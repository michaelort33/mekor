import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  HAND_AUTHORED_DOCUMENTS,
  HAND_AUTHORED_INDEX,
  HAND_AUTHORED_ROUTES,
  HAND_AUTHORED_SEARCH,
  HAND_AUTHORED_TEMPLATES,
} from "../lib/content/hand-authored";
import { TISHA_BAV_5786_EVENT } from "../lib/events/tisha-bav-5786";

const EVENT_PATH = "/events-1/tisha-bav-5786";

async function readJsonFile<T>(relativePath: string) {
  const filePath = path.join(process.cwd(), relativePath);
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

async function readTextFile(relativePath: string) {
  return fs.readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("Tisha B'Av 5786 exists consistently across all generated content bundles", async () => {
  const documents = await readJsonFile<Array<Record<string, unknown>>>(
    "lib/content/generated/documents.json",
  );
  const docs = documents.filter((row) => row.path === EVENT_PATH);
  assert.equal(docs.length, 1, "expected exactly one document record");
  assert.equal(docs[0].type, "event");
  assert.equal(docs[0].title, "Tisha B’Av 5786");
  assert.equal(docs[0].canonical, EVENT_PATH);

  const index = await readJsonFile<Array<{ path: string; type: string }>>(
    "lib/content/generated/index.json",
  );
  assert.equal(
    index.filter((row) => row.path === EVENT_PATH && row.type === "event").length,
    1,
    "expected exactly one index record",
  );

  const routes = await readJsonFile<{ canonical: Array<{ path: string }> }>(
    "lib/content/generated/routes.json",
  );
  assert.equal(
    routes.canonical.filter((row) => row.path === EVENT_PATH).length,
    1,
    "expected a canonical route so the detail page resolves",
  );

  const search = await readJsonFile<Array<{ path: string }>>(
    "lib/content/generated/search.json",
  );
  assert.equal(search.filter((row) => row.path === EVENT_PATH).length, 1);
});

test("Tisha B'Av 5786 template preserves the flyer schedule verbatim", async () => {
  const templates = await readJsonFile<
    Array<{
      kind: string;
      document: { path: string };
      data: {
        title: string;
        location: string;
        isSpecialSchedule?: boolean;
        scheduleTitle?: string;
        scheduleNote?: string;
        signupEnabled?: boolean;
        schedule?: Array<{ dayLabel: string; items: Array<{ time: string; label: string }> }>;
      };
    }>
  >("lib/content/generated/templates.json");

  const records = templates.filter((row) => row.document.path === EVENT_PATH);
  assert.equal(records.length, 1, "expected exactly one template record");
  const record = records[0];
  assert.equal(record.kind, "event");
  assert.equal(record.data.title, "Tisha B’Av 5786");
  assert.equal(record.data.isSpecialSchedule, true);
  assert.equal(record.data.scheduleTitle, "Tisha B’Av service schedule");
  assert.match(record.data.scheduleNote ?? "", /replace the regular Davening schedule/);
  assert.equal(record.data.signupEnabled, false);

  const schedule = record.data.schedule;
  assert.ok(schedule && schedule.length > 0, "expected a structured schedule");
  assert.deepEqual(
    schedule.map((day) => day.dayLabel),
    ["Wednesday, July 22nd", "Thursday, July 23rd"],
  );
  assert.deepEqual(
    schedule.flatMap((day) => day.items.map((item) => `${item.time} ${item.label}`)),
    [
      "8:15pm Mincha",
      "8:23pm Beginning of Fast",
      "8:30pm Maariv followed by Megilat Eicha",
      "6:45am Morning Services",
      "~7:30am Kinnot",
      "1:06pm Midday",
      "7:00pm Class with Rabbi Hirsch",
      "8:00pm Mincha",
      "8:30pm Maariv",
      "8:57pm Fast Ends",
    ],
  );
});

test("Tisha B'Av DB script stores instant-correct Eastern-time boundaries", async () => {
  const script = await readTextFile("scripts/db/add-tisha-bav-5786-event.ts");
  assert.equal(TISHA_BAV_5786_EVENT.startAt, "2026-07-22T20:15:00-04:00");
  assert.equal(TISHA_BAV_5786_EVENT.endAt, "2026-07-23T20:57:00-04:00");
  assert.equal(TISHA_BAV_5786_EVENT.featured, true);
  assert.match(script, /TISHA_BAV_5786_EVENT/);
  assert.doesNotMatch(
    script,
    /new Date\(\s*2026\s*,/,
    "machine-local Date construction is not instant-safe",
  );
});

test("content generation keeps the hand-authored event in every bundle", async () => {
  assert.equal(HAND_AUTHORED_DOCUMENTS.filter((row) => row.path === EVENT_PATH).length, 1);
  assert.equal(HAND_AUTHORED_INDEX.filter((row) => row.path === EVENT_PATH).length, 1);
  assert.equal(HAND_AUTHORED_TEMPLATES.filter((row) => row.document.path === EVENT_PATH).length, 1);
  assert.equal(HAND_AUTHORED_ROUTES.canonical.filter((row) => row.path === EVENT_PATH).length, 1);
  assert.equal(HAND_AUTHORED_SEARCH.filter((row) => row.path === EVENT_PATH).length, 1);

  const generator = await readTextFile("scripts/content/generate-native-content.ts");
  assert.match(generator, /HAND_AUTHORED_DOCUMENTS/);
  assert.match(generator, /HAND_AUTHORED_TEMPLATES/);
  assert.match(generator, /HAND_AUTHORED_ROUTES/);
});

test("homepage events section stays data-driven and zone-pinned", async () => {
  const page = await readTextFile("app/page.tsx");
  assert.doesNotMatch(page, /Tisha/i, "homepage must not hard-code event content");
  assert.match(page, /getEventDateParts/, "homepage date chips derive via the pinned formatter");

  const calendar = await readTextFile("app/events/events-calendar.tsx");
  assert.match(calendar, /getEventDateParts/, "calendar bucketing derives via the pinned formatter");
});
