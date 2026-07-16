import assert from "node:assert/strict";
import test from "node:test";

import { KOSHER_MAP_LOCATIONS } from "../lib/kosher/map-locations";

test("kosher map coordinates cover the active regional directory", () => {
  const locations = Object.values(KOSHER_MAP_LOCATIONS);

  assert.ok(locations.length >= 80, "expected coordinates for the full kosher directory");
  for (const location of locations) {
    assert.ok(location.lat >= 39 && location.lat <= 42, `unexpected latitude ${location.lat}`);
    assert.ok(location.lng >= -76 && location.lng <= -73, `unexpected longitude ${location.lng}`);
  }
});

test("kosher map coordinates contain no duplicate paths", () => {
  const paths = Object.keys(KOSHER_MAP_LOCATIONS);
  assert.equal(new Set(paths).size, paths.length);
});

test("That Sushi Spot uses its Merion Station pickup location", () => {
  assert.deepEqual(KOSHER_MAP_LOCATIONS["/post/that-sushi-spot-lkwd-nj-lakewood"], {
    lat: 40.0006646,
    lng: -75.240861,
  });
});

test("Say She Ate uses its verified South Street location", () => {
  assert.deepEqual(KOSHER_MAP_LOCATIONS["/post/say-she-ate-caf%C3%A9"], {
    lat: 39.9436332,
    lng: -75.1659843,
  });
});
