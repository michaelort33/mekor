import assert from "node:assert/strict";
import test from "node:test";

import { loadExtractedKosherPlaces } from "../lib/kosher/extract";
import { filterKosherPlaces } from "../lib/kosher/store";

test("kosher extraction loads structured places with neighborhoods and tags", async () => {
  const places = await loadExtractedKosherPlaces();

  assert.ok(places.length >= 70, "expected at least 70 extracted kosher places");
  assert.ok(places.every((row) => row.path.startsWith("/post/")));
  assert.ok(places.every((row) => row.title.length > 0));
  assert.ok(
    places.some((row) => row.neighborhood === "center-city"),
    "expected center-city places",
  );
  assert.ok(
    places.some((row) => row.neighborhood === "main-line-manyunk"),
    "expected main-line-manyunk places",
  );
  assert.ok(
    places.some((row) => row.neighborhood === "old-yorkroad-northeast"),
    "expected old-yorkroad-northeast places",
  );
  assert.ok(
    places.some((row) => row.neighborhood === "cherry-hill"),
    "expected cherry-hill places",
  );
});

test("kosher extraction captures known fields for Cinnaholic", async () => {
  const places = await loadExtractedKosherPlaces();
  const cinnaholic = places.find((row) => row.title.toLowerCase() === "cinnaholic");

  assert.ok(cinnaholic, "expected Cinnaholic row");
  assert.equal(cinnaholic?.neighborhood, "cherry-hill");
  assert.ok(cinnaholic?.address.includes("Umbria"), "expected Cinnaholic address");
  assert.ok(cinnaholic?.tags.includes("Bakery"), "expected bakery tag");
  assert.ok(cinnaholic?.locationHref.startsWith("http"), "expected map location link");
});

test("kosher filters apply neighborhood, tag, and search", async () => {
  const extracted = await loadExtractedKosherPlaces();
  const places = extracted.map((row) => ({
    ...row,
    sourceCapturedAt: null,
  }));

  const cherryHill = filterKosherPlaces(places, { neighborhood: "cherry-hill" });
  assert.ok(cherryHill.length > 0);
  assert.ok(cherryHill.every((row) => row.neighborhood === "cherry-hill"));

  const bakeries = filterKosherPlaces(places, { tag: "bakery" });
  assert.ok(bakeries.length > 0);
  assert.ok(bakeries.every((row) => row.tags.some((tag) => tag.toLowerCase() === "bakery")));

  const searched = filterKosherPlaces(places, { search: "cinnaholic" });
  assert.ok(searched.length > 0);
  assert.ok(searched.some((row) => row.title.toLowerCase() === "cinnaholic"));
});
