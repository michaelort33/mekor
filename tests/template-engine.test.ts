import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { getDocumentByPath } from "../lib/mirror/loaders";
import { buildDocumentMetadata } from "../lib/templates/metadata";
import { resolveTemplateRoute } from "../lib/templates/resolve-template-route";
import {
  buildArchiveTemplateData,
  buildArticleTemplateData,
  buildEventTemplateData,
  buildProfileTemplateData,
} from "../lib/templates/template-data";

type ContentIndexRecord = {
  path: string;
  type: string;
  file: string;
};

async function readJsonFile<T>(relativePath: string) {
  const filePath = path.join(process.cwd(), relativePath);
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

test("template scope counts match extracted content index", async () => {
  const index = await readJsonFile<ContentIndexRecord[]>("mirror-data/content/index.json");
  const counts = index.reduce<Record<string, number>>((acc, row) => {
    acc[row.type] = (acc[row.type] ?? 0) + 1;
    return acc;
  }, {});

  assert.equal(counts.post, 92);
  assert.equal(counts.news, 35);
  assert.equal(counts.event, 19);
  assert.equal(counts.profile, 2);
  assert.equal(counts.category, 6);
  assert.equal(counts.tag, 7);
});

test("alias routes resolve to canonical template documents", async () => {
  const resolved = await resolveTemplateRoute("/post/Cinnaholic");
  assert.equal(resolved.status, "ok");

  if (resolved.status !== "ok") {
    return;
  }

  assert.equal(resolved.resolvedPath, "/post/cinnaholic");
  assert.equal(resolved.document.path, "/post/Cinnaholic");
});

test("metadata parity keeps canonical and social fields for template docs", async () => {
  const doc = await getDocumentByPath("/events-1/mekor-pesach-seders");
  assert.ok(doc, "expected event document");

  const metadata = buildDocumentMetadata(doc);
  assert.equal(metadata.description, doc?.description);
  assert.equal(metadata.alternates?.canonical, doc?.canonical);
  assert.equal(metadata.openGraph?.url, doc?.canonical);
  assert.equal(metadata.twitter?.title, doc?.twitterTitle.replace(/\bMekor 3\b/g, "Mekor Habracha"));
});

test("article template parser returns structured post and news data", async () => {
  const [postDoc, newsDoc] = await Promise.all([
    getDocumentByPath("/post/20th-street-pizza"),
    getDocumentByPath("/news/a-night-of-megillah-and-music-at-mekor-habracha"),
  ]);

  assert.ok(postDoc, "expected post document");
  assert.ok(newsDoc, "expected news document");

  const postData = buildArticleTemplateData(postDoc!);
  const newsData = buildArticleTemplateData(newsDoc!);

  assert.equal(postData.type, "post");
  assert.equal(newsData.type, "news");
  assert.ok(postData.title.length > 0);
  assert.ok(newsData.title.length > 0);
  assert.ok(postData.facts.length > 0, "expected structured post facts");
  assert.ok(newsData.body.length > 0, "expected parsed news body");
});

test("event/profile/archive template parser returns structured data", async () => {
  const [eventDoc, profileDoc, categoryDoc, categoryPage2Doc] = await Promise.all([
    getDocumentByPath("/events-1/mekor-pesach-seders"),
    getDocumentByPath("/profile/rabbiehirsch/profile"),
    getDocumentByPath("/kosher-posts/categories/center-city"),
    getDocumentByPath("/kosher-posts/categories/center-city/page/2"),
  ]);

  assert.ok(eventDoc, "expected event document");
  assert.ok(profileDoc, "expected profile document");
  assert.ok(categoryDoc, "expected category document");
  assert.ok(categoryPage2Doc, "expected paginated category document");

  const eventData = buildEventTemplateData(eventDoc!);
  const profileData = await buildProfileTemplateData(profileDoc!);
  const archiveData = await buildArchiveTemplateData(categoryDoc!);
  const archivePage2Data = await buildArchiveTemplateData(categoryPage2Doc!);

  assert.ok(eventData.title.length > 0);
  assert.equal(eventData.seeOtherEventsHref, "/events");
  assert.ok(profileData.profileName.length > 0);
  assert.ok(profileData.featuredPosts.length > 0);
  assert.ok(archiveData.entries.length > 0);
  assert.equal(archiveData.nextPageHref, "/kosher-posts/categories/center-city/page/2");
  assert.equal(archivePage2Data.prevPageHref, "/kosher-posts/categories/center-city");
});

test("template components and routes do not use dangerouslySetInnerHTML", async () => {
  const files = [
    "components/templates/article-template.tsx",
    "components/templates/event-template.tsx",
    "components/templates/profile-template.tsx",
    "components/templates/archive-template.tsx",
    "app/post/[slug]/page.tsx",
    "app/news/[slug]/page.tsx",
    "app/events-1/[slug]/page.tsx",
    "app/profile/[...parts]/page.tsx",
    "app/kosher-posts/categories/[slug]/page.tsx",
    "app/kosher-posts/categories/[slug]/page/[page]/page.tsx",
    "app/kosher-posts/tags/[slug]/page.tsx",
    "app/kosher-posts/tags/[slug]/page/[page]/page.tsx",
  ];

  await Promise.all(
    files.map(async (relativePath) => {
      const content = await fs.readFile(path.join(process.cwd(), relativePath), "utf8");
      assert.equal(
        content.includes("dangerouslySetInnerHTML"),
        false,
        `dangerouslySetInnerHTML found in ${relativePath}`,
      );
    }),
  );
});
