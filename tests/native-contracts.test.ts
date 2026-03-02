import assert from "node:assert/strict";
import test from "node:test";

import { getManagedEvents } from "../lib/events/store";
import { getManagedInTheNews } from "../lib/in-the-news/store";
import { getManagedKosherPlaces } from "../lib/kosher/store";
import { loadSearchIndex } from "../lib/mirror/loaders";
import {
  MIRROR_ONLY_FIELD_LIFECYCLE,
  NATIVE_CONTRACT_MATRIX,
  NATIVE_ENABLED_ROUTE_PATHS,
  validateManagedEventsContract,
  validateManagedInTheNewsContract,
  validateManagedKosherPlacesContract,
  validateSearchIndexContract,
} from "../lib/native/contracts";

test("native contract matrix matches native-enabled route list", () => {
  const matrixRoutes = new Set(NATIVE_CONTRACT_MATRIX.map((row) => row.routePath));
  const enabledRoutes = new Set(NATIVE_ENABLED_ROUTE_PATHS);

  assert.equal(matrixRoutes.size, enabledRoutes.size);

  for (const routePath of enabledRoutes) {
    assert.equal(matrixRoutes.has(routePath), true, `missing matrix contract for ${routePath}`);
  }
});

test("native model contracts validate live managed payloads", async () => {
  const [events, inTheNews, kosherPlaces, searchIndex] = await Promise.all([
    getManagedEvents(),
    getManagedInTheNews(),
    getManagedKosherPlaces(),
    loadSearchIndex(),
  ]);

  const validatedEvents = validateManagedEventsContract(events, "test: events");
  const validatedArticles = validateManagedInTheNewsContract(inTheNews, "test: in-the-news");
  const validatedPlaces = validateManagedKosherPlacesContract(kosherPlaces, "test: kosher places");
  const validatedSearch = validateSearchIndexContract(searchIndex, "test: search index");

  assert.ok(validatedEvents.length >= 1, "expected at least one event for native events route");
  assert.ok(validatedArticles.length >= 20, "expected healthy in-the-news sample size");
  assert.ok(validatedPlaces.length >= 20, "expected healthy kosher place sample size");
  assert.ok(validatedSearch.length >= 50, "expected healthy search index size");
});

test("native kosher routes have neighborhood coverage", async () => {
  const places = validateManagedKosherPlacesContract(
    await getManagedKosherPlaces(),
    "test: kosher neighborhood coverage",
  );

  const neighborhoods = new Set(places.map((row) => row.neighborhood));

  assert.equal(neighborhoods.has("center-city"), true);
  assert.equal(neighborhoods.has("cherry-hill"), true);
  assert.equal(neighborhoods.has("main-line-manyunk"), true);
  assert.equal(neighborhoods.has("old-yorkroad-northeast"), true);
});

test("mirror-only field lifecycle is fully tracked", () => {
  const lifecycleKeys = new Set(MIRROR_ONLY_FIELD_LIFECYCLE.map((row) => `${row.dataset}:${row.field}`));

  const expected = [
    "events:capturedAt",
    "events:sourceJson",
    "events:sourceCapturedAt",
    "in-the-news:capturedAt",
    "in-the-news:sourceJson",
    "in-the-news:sourceCapturedAt",
    "kosher:capturedAt",
    "kosher:sourceJson",
    "kosher:sourceCapturedAt",
  ];

  for (const key of expected) {
    assert.equal(lifecycleKeys.has(key), true, `missing mirror-only lifecycle key: ${key}`);
  }
});
