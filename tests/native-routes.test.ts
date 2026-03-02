import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { filterPodcastEpisodes } from "../components/podcast/rabbi-desk-podcast-list";
import { buildVolunteerPayload } from "../components/volunteer/volunteer-form";
import { isTeam0NativeRouteEnabled } from "../lib/native-routes/team0-flags";

async function readTextFile(relativePath: string) {
  const filePath = path.join(process.cwd(), relativePath);
  return fs.readFile(filePath, "utf8");
}

test("team0 route flags default to native enabled and accept explicit rollback values", () => {
  const key = "TEAM0_NATIVE_TEAM_4";
  const previous = process.env[key];

  delete process.env[key];
  assert.equal(isTeam0NativeRouteEnabled("/team-4"), true);

  process.env[key] = "false";
  assert.equal(isTeam0NativeRouteEnabled("/team-4"), false);

  process.env[key] = "0";
  assert.equal(isTeam0NativeRouteEnabled("/team-4"), false);

  process.env[key] = "true";
  assert.equal(isTeam0NativeRouteEnabled("/team-4"), true);

  if (previous === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = previous;
  }
});

test("volunteer payload keeps endpoint contract fields and message format", () => {
  const payload = buildVolunteerPayload(
    {
      firstName: "Ari",
      lastName: "Levi",
      email: "ari@example.com",
      phone: "215-555-1212",
      opportunity: "Meal Train and Shabbat Hospitality",
      availabilityDate: "2026-03-11",
    },
    "/team-4",
  );

  assert.equal(payload.name, "Ari Levi");
  assert.equal(payload.sourcePath, "/team-4");
  assert.equal(payload.email, "ari@example.com");
  assert.equal(payload.opportunity, "Meal Train and Shabbat Hospitality");
  assert.match(payload.message, /Opportunity: Meal Train and Shabbat Hospitality/);
  assert.match(payload.message, /Availability Date: 2026-03-11/);
  assert.match(payload.message, /First Name: Ari/);
  assert.match(payload.message, /Last Name: Levi/);
});

test("podcast search behavior matches title and description filtering", () => {
  const episodes = [
    {
      id: "1",
      title: "Purim Q&A",
      description: "Community halacha topics",
      episodeUrl: null,
      audioUrl: null,
      duration: null,
      publishedAt: null,
    },
    {
      id: "2",
      title: "Weekly Dvar Torah",
      description: "Purim insights",
      episodeUrl: null,
      audioUrl: null,
      duration: null,
      publishedAt: null,
    },
    {
      id: "3",
      title: "Parsha Notes",
      description: "Shabbat schedule",
      episodeUrl: null,
      audioUrl: null,
      duration: null,
      publishedAt: null,
    },
  ];

  const bySearch = filterPodcastEpisodes(episodes, "purim");
  assert.deepEqual(
    bySearch.map((episode) => episode.id),
    ["1", "2"],
  );

  const all = filterPodcastEpisodes(episodes, " ");
  assert.equal(all.length, 3);
});

test("cutover removed route-specific mirror runtime surgery and keeps native route exclusions", async () => {
  const [runtimeSource, catchAllSource] = await Promise.all([
    readTextFile("components/mirror/mirror-runtime.tsx"),
    readTextFile("app/[...slug]/page.tsx"),
  ]);

  assert.equal(runtimeSource.includes('path !== "/team-4"'), false);
  assert.equal(runtimeSource.includes('path !== "/from-the-rabbi-s-desk"'), false);

  assert.equal(catchAllSource.includes('"/team-4"'), true);
  assert.equal(catchAllSource.includes('"/from-the-rabbi-s-desk"'), true);
  assert.equal(catchAllSource.includes('"/kosher-map"'), true);
});

test("document-html no longer applies team-4 and kosher-map route patches", async () => {
  const source = await readTextFile("lib/mirror/document-html.ts");

  assert.equal(source.includes("configureVolunteerForm"), false);
  assert.equal(source.includes("applyKosherMapPageFallback"), false);
  assert.equal(source.includes('path === "/team-4"'), false);
  assert.equal(source.includes("path === KOSHER_MAP_PATH"), false);
});
