import test from "node:test";
import assert from "node:assert/strict";

import { getHebrewYearContext } from "@/lib/calendar/hebrew-year";

test("hebrew year context matches spring 2026 membership season labels", () => {
  const context = getHebrewYearContext(new Date("2026-03-16T16:00:00.000Z"));

  assert.equal(context.currentHebrewYear, 5786);
  assert.equal(context.currentHebrewYearLabel, "5786");
  assert.equal(context.nextRoshHashanaHebrewYear, 5787);
  assert.equal(context.nextRoshHashanaHebrewYearLabel, "5787");
  assert.equal(context.currentCivilSpanLabel, "2025-2026");
});

test("hebrew year context rolls forward after the fall transition", () => {
  const context = getHebrewYearContext(new Date("2026-10-15T16:00:00.000Z"));

  assert.equal(context.currentHebrewYear, 5787);
  assert.equal(context.nextRoshHashanaHebrewYear, 5788);
  assert.equal(context.currentCivilSpanLabel, "2026-2027");
});
