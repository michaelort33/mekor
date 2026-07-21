import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  SPECIAL_DAVENING_SCHEDULES,
  splitSpecialDaveningSchedules,
} from "../lib/davening/special-schedules";

test("upcoming special schedules remain expanded until their final service ends", () => {
  const beforeEnd = splitSpecialDaveningSchedules(
    SPECIAL_DAVENING_SCHEDULES,
    new Date("2026-07-24T00:56:59.000Z"),
  );

  assert.deepEqual(beforeEnd.upcoming.map((schedule) => schedule.id), ["tisha-bav-5786"]);
  assert.equal(beforeEnd.past.length, 0);
});

test("special schedules move to the collapsed archive at the recorded end instant", () => {
  const atEnd = splitSpecialDaveningSchedules(
    SPECIAL_DAVENING_SCHEDULES,
    new Date("2026-07-24T00:57:00.000Z"),
  );

  assert.equal(atEnd.upcoming.length, 0);
  assert.deepEqual(atEnd.past.map((schedule) => schedule.id), ["tisha-bav-5786"]);
});

test("the Davening page evaluates special schedules per request", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "app/davening/page.tsx"), "utf8");
  const scheduleSource = await fs.readFile(
    path.join(process.cwd(), "app/davening/special-davening-schedules.tsx"),
    "utf8",
  );

  assert.match(source, /export const dynamic = "force-dynamic"/);
  assert.match(source, /<SpecialDaveningSchedules \/>/);
  assert.match(scheduleSource, /<details className=\{styles\.pastSpecialSchedules\}>/);
  assert.match(scheduleSource, /Past special schedules/);
  assert.doesNotMatch(scheduleSource, /<details[^>]*\sopen/);
});
