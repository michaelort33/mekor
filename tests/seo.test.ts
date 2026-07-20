import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import { GET as getEventSitemap } from "../app/event-pages-sitemap.xml/route";
import { GET as getSitemapIndex } from "../app/sitemap.xml/route";
import { listSitemapEntriesBySection } from "../lib/content/native-content";
import { buildPageMetadata } from "../lib/seo/metadata";
import { serializeJsonLd, SITE_STRUCTURED_DATA } from "../lib/seo/structured-data";

test("sitemap index points only to concrete XML routes", async () => {
  const response = await getSitemapIndex();
  const xml = await response.text();

  assert.equal(response.headers.get("content-type"), "application/xml; charset=utf-8");
  assert.match(xml, /<sitemapindex/);
  assert.match(xml, /event-pages-sitemap\.xml/);
  assert.match(xml, /community-content-sitemap\.xml/);
  assert.doesNotMatch(xml, /generatedBy="MIRROR"/);
  assert.doesNotMatch(xml, /<lastmod>/, "the index must not claim every section changed today");

  await Promise.all(
    [
      "app/blog-posts-sitemap.xml/route.ts",
      "app/event-pages-sitemap.xml/route.ts",
      "app/dynamic-news-sitemap.xml/route.ts",
      "app/pages-sitemap.xml/route.ts",
      "app/community-content-sitemap.xml/route.ts",
    ].map((path) => fs.access(path)),
  );
  await assert.rejects(fs.access("app/[sectionSitemap].xml/route.ts"));
});

test("event sitemap includes Tisha B'Av with its real content timestamp", async () => {
  const response = await getEventSitemap();
  const xml = await response.text();

  assert.match(xml, /https:\/\/www\.mekorhabracha\.org\/events-1\/tisha-bav-5786/);
  assert.match(xml, /<lastmod>2026-07-20T12:00:00\.000Z<\/lastmod>/);
  assert.doesNotMatch(xml, /<lastmod>2026-07-20<\/lastmod>/);
});

test("sitemap source excludes retired, hidden, and redirected aliases", async () => {
  const [pages, posts] = await Promise.all([
    listSitemapEntriesBySection("pages-sitemap"),
    listSitemapEntriesBySection("blog-posts-sitemap"),
  ]);
  const pagePaths = pages.map((entry) => entry.path);
  const postPaths = posts.map((entry) => entry.path);

  assert.equal(pagePaths.includes("/our-rabbis"), true);
  assert.equal(pagePaths.includes("/our-rabbi"), false);
  assert.equal(pagePaths.includes("/about-5"), false);
  assert.equal(pagePaths.includes("/membership-old"), false);
  assert.equal(pagePaths.includes("/center-city-south-philly-er"), false);
  assert.equal(pagePaths.includes("/kosher-posts"), false);
  assert.equal(pagePaths.includes("/letterfromisrael"), false);
  assert.equal(pagePaths.includes("/cherry-hill"), false);
  assert.equal(pagePaths.includes("/main-line-manyunk"), false);
  assert.equal(pagePaths.includes("/old-yorkroad-northeast"), false);
  assert.equal(postPaths.includes("/post/hipcityveg-1"), false);
  assert.equal(postPaths.includes("/post/hipcityveg"), true);
});

test("shared metadata emits canonical, social, and noindex controls", () => {
  const metadata = buildPageMetadata({
    path: "/search",
    title: "Search | Mekor Habracha",
    description: "Search public Mekor content.",
    noIndex: true,
  });

  assert.equal(metadata.alternates?.canonical, "https://www.mekorhabracha.org/search");
  assert.equal(metadata.openGraph?.url, "https://www.mekorhabracha.org/search");
  assert.equal(metadata.openGraph?.siteName, "Mekor Habracha");
  assert.equal(metadata.twitter?.card, "summary_large_image");
  assert.deepEqual(metadata.robots, { index: false, follow: false });
});

test("site structured data identifies the synagogue and escapes script delimiters", () => {
  const json = serializeJsonLd(SITE_STRUCTURED_DATA);
  assert.match(json, /"WebSite"/);
  assert.match(json, /"PlaceOfWorship"/);
  assert.match(json, /1500 Walnut St, Suite 206/);
  assert.equal(serializeJsonLd({ value: "</script>" }).includes("</script>"), false);
});

test("robots and AI discovery files welcome public crawlers but protect private routes", async () => {
  const [robotsSource, llmsSource, configSource] = await Promise.all([
    fs.readFile("app/robots.txt/route.ts", "utf8"),
    fs.readFile("app/llms.txt/route.ts", "utf8"),
    fs.readFile("next.config.ts", "utf8"),
  ]);

  assert.match(robotsSource, /rulesFor\("OAI-SearchBot"\)/);
  assert.match(robotsSource, /rulesFor\("GPTBot"\)/);
  assert.match(robotsSource, /"\/admin\/"/);
  assert.match(llmsSource, /Official website for Mekor Habracha/);
  assert.match(llmsSource, /Past Newsletters/);
  assert.match(configSource, /X-Robots-Tag/);
  assert.match(configSource, /noindex, nofollow/);
});
