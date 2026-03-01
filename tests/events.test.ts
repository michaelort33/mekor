import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { loadExtractedEvents } from "../lib/events/extract";
import { prepareMirrorDocumentHtml } from "../lib/mirror/document-html";

async function readJsonFile<T>(relativePath: string) {
  const filePath = path.join(process.cwd(), relativePath);
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

test("event extraction loads deduped events with key fields", async () => {
  const events = await loadExtractedEvents();

  assert.ok(events.length >= 5, "expected at least a handful of extracted events");
  assert.ok(events.every((row) => row.path.startsWith("/events-1/")));
  assert.ok(events.every((row) => row.title.length > 0));
  assert.ok(events.some((row) => row.isClosed), "expected at least one closed event");
});

test("closed event 'See other events' CTA is rewritten to /events", async () => {
  const record = await readJsonFile<{ bodyHtml: string }>(
    "mirror-data/content/documents/event/events-1__mekor-pesach-seders--bde0f8c30141.json",
  );

  const prepared = prepareMirrorDocumentHtml(record.bodyHtml, "/events-1/mekor-pesach-seders");
  assert.match(prepared, /data-hook="RSVP_INFO_BUTTON" href="\/events"/);
});

test("youtube embeds are rewritten as click-to-load placeholders", () => {
  const prepared = prepareMirrorDocumentHtml(
    '<iframe src="https://www.youtube.com/embed/aieR-a2z1RY?autoplay=0&mute=0&controls=1"></iframe>',
    "/israel",
  );

  assert.match(prepared, /data-mekor-deferred-embed="youtube"/);
  assert.match(prepared, /src="about:blank"/);
  assert.match(prepared, /Tap to load video/);
});

test("google maps embeds are rewritten as click-to-load placeholders", () => {
  const prepared = prepareMirrorDocumentHtml(
    '<iframe src="https://maps.google.com/maps?q=1500%20Walnut%20St%20Suite%20206%20Philadelphia%20PA&output=embed"></iframe>',
    "/visit-us",
  );

  assert.match(prepared, /data-mekor-deferred-embed="map"/);
  assert.match(prepared, /src="about:blank"/);
  assert.match(prepared, /Load interactive map/);
});
