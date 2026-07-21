import assert from "node:assert/strict";
import test from "node:test";

import { EVENT_TIME_ZONE, getEventDateParts } from "../lib/events/format";
import { getEventStatus, isEventPast } from "../lib/events/status";
import { toManagedEvent } from "../lib/events/store";
import { validateManagedEventsContract } from "../lib/native/contracts";

// Tisha B'Av 5786: Wed Jul 22, 2026 8:15 PM EDT → Thu Jul 23, 2026 8:57 PM EDT.
const TISHA_BAV_START = "2026-07-23T00:15:00.000Z";
const TISHA_BAV_END = "2026-07-24T00:57:00.000Z";

test("getEventStatus derives upcoming, ongoing, and past from start/end instants", () => {
  const input = { startAt: TISHA_BAV_START, endAt: TISHA_BAV_END };

  assert.equal(getEventStatus(input, new Date("2026-07-20T12:00:00.000Z")), "upcoming");
  assert.equal(getEventStatus(input, new Date("2026-07-23T00:15:00.000Z")), "ongoing");
  assert.equal(getEventStatus(input, new Date("2026-07-23T12:00:00.000Z")), "ongoing");
  assert.equal(getEventStatus(input, new Date("2026-07-24T00:57:00.000Z")), "past");
  assert.equal(getEventStatus({ startAt: null, endAt: null }, new Date()), "upcoming");
});

test("event without an end time becomes past once its start elapses", () => {
  const input = { startAt: TISHA_BAV_START, endAt: null };

  assert.equal(getEventStatus(input, new Date("2026-07-22T23:00:00.000Z")), "upcoming");
  assert.equal(getEventStatus(input, new Date("2026-07-23T00:15:00.000Z")), "past");
  assert.equal(isEventPast(input, new Date("2026-07-23T00:15:00.000Z")), true);
});

test("getEventStatus agrees with isEventPast at every boundary", () => {
  const probes = [
    new Date("2026-07-22T00:00:00.000Z"),
    new Date("2026-07-23T00:15:00.000Z"),
    new Date("2026-07-24T00:56:59.000Z"),
    new Date("2026-07-24T00:57:00.000Z"),
    new Date("2026-08-01T00:00:00.000Z"),
  ];

  for (const now of probes) {
    const input = { startAt: TISHA_BAV_START, endAt: TISHA_BAV_END };
    assert.equal(getEventStatus(input, now) === "past", isEventPast(input, now));
  }
});

test("getEventDateParts pins event dates to the synagogue time zone", () => {
  assert.equal(EVENT_TIME_ZONE, "America/New_York");

  // 00:15 UTC on Jul 23 is still Wednesday Jul 22 in Philadelphia.
  const parts = getEventDateParts(TISHA_BAV_START);
  assert.ok(parts, "expected parts for a valid instant");
  assert.equal(parts.year, 2026);
  assert.equal(parts.monthIndex, 6);
  assert.equal(parts.day, 22);
  assert.equal(parts.monthShort, "Jul");
  assert.equal(parts.monthLong, "July");
  assert.equal(parts.weekdayShort, "Wed");

  // The zone parameter is honored (a UTC reading lands on the next civil day).
  const utcParts = getEventDateParts(TISHA_BAV_START, "UTC");
  assert.ok(utcParts);
  assert.equal(utcParts.day, 23);

  assert.equal(getEventDateParts(null), null);
  assert.equal(getEventDateParts("not a date"), null);
});

test("toManagedEvent surfaces featured, summary, and status and passes the contract", () => {
  const managed = toManagedEvent({
    slug: "tisha-bav-5786",
    path: "/events-1/tisha-bav-5786",
    title: "Tisha B'Av 5786",
    shortDate: "Jul 22–23, 2026",
    location: "Mekor Habracha · Center City Synagogue",
    timeLabel: "Wed 8:15 PM – Thu 8:57 PM",
    startAt: new Date(TISHA_BAV_START),
    endAt: new Date(TISHA_BAV_END),
    isClosed: false,
    sourceJson: {
      heroImage: "",
      description: "Communal observance of Tisha B'Av at Mekor Habracha.",
      featured: true,
      specialSchedule: true,
    },
  });

  assert.equal(managed.featured, true);
  assert.equal(managed.specialSchedule, true);
  assert.equal(managed.summary, "Communal observance of Tisha B'Av at Mekor Habracha.");
  assert.ok(["upcoming", "ongoing", "past"].includes(managed.status));
  assert.equal(managed.isPast, managed.status === "past");

  const [validated] = validateManagedEventsContract([managed], "test: featured event");
  assert.equal(validated.featured, true);
  assert.equal(validated.specialSchedule, true);
  assert.equal(validated.summary, "Communal observance of Tisha B'Av at Mekor Habracha.");
  assert.equal(validated.status, managed.status);
});

test("toManagedEvent defaults featured/summary when sourceJson omits them", () => {
  const managed = toManagedEvent({
    slug: "plain-event",
    path: "/events-1/plain-event",
    title: "Plain Event",
    shortDate: "",
    location: "",
    timeLabel: "",
    startAt: null,
    endAt: null,
    isClosed: false,
    sourceJson: {},
  });

  assert.equal(managed.featured, false);
  assert.equal(managed.specialSchedule, false);
  assert.equal(managed.summary, "");
  assert.equal(managed.status, "upcoming");
  validateManagedEventsContract([managed], "test: plain event");
});
