import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { buildSearchDocuments, listRoutesBySection } from "../lib/content/native-content";

async function readSource(relativePath: string) {
  return fs.readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("Rabbi Hirsch books and reflections retain the original wording and visible destinations", async () => {
  const source = await readSource("app/our-rabbis/page.tsx");

  assert.match(source, /engaging Torah classes/);
  assert.match(source, /You can read some of Rabbi Hirsch&?apos;s inspirational reflections/);
  assert.match(source, /92f487_19066816f85142bb94e30b3d0ff2bb26\.pdf/);
  assert.doesNotMatch(source, /substack\.com\/p\/on-parkinsons-disease-and-emunah/);
  assert.match(source, /Pesach Without the Pain: A Practical Guide to the Laws and Practices of Passover/);
  assert.match(source, /Bringing Order to the Seder: A Modern Guide to the Traditional Passover Haggadah/);
  assert.match(source, /The Book of Life: A Transformative Guide to the High Holidays/);
  assert.match(source, /<ul className=\{styles\.bookList\} aria-label="Books by Rabbi Hirsch">/);
  assert.match(source, /HIRSCH_BOOK_LINKS\.map[\s\S]*<a href=\{book\.href\}/);
  assert.match(source, /HIRSCH_ONLINE_LINKS\.map[\s\S]*<BrandedLink key=\{item\.href\} \{\.\.\.item\} iconOnly \/>/);
  assert.doesNotMatch(source, /publicationShelf|rabbi-hirsch-resources|HIRSCH_COMMUNITY_LINKS/);
});

test("Rabbi links expose recognizable brands and external-link cues", async () => {
  const [pageSource, homepageSource, primitiveSource] = await Promise.all([
    readSource("app/our-rabbis/page.tsx"),
    readSource("app/page.tsx"),
    readSource("components/marketing/primitives.tsx"),
  ]);

  assert.match(pageSource, /A Quest for Our Times: The Louis Jacobs Haggadah \(Izzun Books, 2025\)/);
  assert.match(pageSource, /brand: "facebook"/);
  assert.match(pageSource, /brand: "linkedin"/);
  assert.match(pageSource, /Book Talk with Rabbi Steven Gotlib/);
  assert.match(pageSource, /Explore and connect/);
  assert.match(pageSource, /Rabbi Hirsch online resources/);
  assert.match(pageSource, /iconOnly/);
  assert.match(pageSource, /https:\/\/18forty\.org\/author-name\/steven-gotlib\//);
  assert.match(pageSource, /brand: "eighteenforty"/);
  assert.match(homepageSource, /<BrandedLink key=\{link\.label\} \{\.\.\.link\} compact \/>/);
  assert.match(homepageSource, /brand: "podcast"/);
  assert.match(homepageSource, /brand: "substack"/);
  assert.match(homepageSource, /brand: "amazon"/);
  assert.match(homepageSource, /https:\/\/rabbistevengotlib\.substack\.com\//);
  assert.match(homepageSource, /brand: "eighteenforty"/);
  assert.match(primitiveSource, /data-brand=\{brand\}/);
  assert.match(primitiveSource, /<ExternalLink/);
  assert.match(primitiveSource, /<ArrowRight/);
  assert.match(primitiveSource, /function AmazonMark/);
  assert.match(primitiveSource, /function SubstackMark/);
  assert.match(primitiveSource, /function EighteenFortyMark/);
});

test("Rabbi headshots stay proportionate across stacked layouts", async () => {
  const [pageSource, styleSource] = await Promise.all([
    readSource("app/our-rabbis/page.tsx"),
    readSource("app/our-rabbis/page.module.css"),
  ]);

  assert.match(pageSource, /cn\(styles\.profilePhotoWrap, styles\.hirschPhotoWrap\)/);
  assert.match(styleSource, /grid-template-columns: minmax\(250px, 360px\) minmax\(0, 1fr\)/);
  assert.match(
    styleSource,
    /\.profilePhotoWrap\.hirschPhotoWrap\s*\{[\s\S]*?max-width: 360px;[\s\S]*?\}/,
  );
  assert.match(
    styleSource,
    /@media \(max-width: 960px\)[\s\S]*?\.profilePhotoWrap\s*\{[\s\S]*?max-width: 420px;[\s\S]*?\}/,
  );
  assert.doesNotMatch(
    styleSource,
    /@media \(max-width: 760px\)[\s\S]*?\.profilePhotoWrap\s*\{[\s\S]*?max-width: 100%;/,
  );
});

test("Our Rabbis uses the plural canonical route everywhere public", async () => {
  const [pageSource, configSource, homepageSource, menuSource, leadershipSource, mediumPageSource] =
    await Promise.all([
      readSource("app/our-rabbis/page.tsx"),
      readSource("next.config.ts"),
      readSource("app/page.tsx"),
      readSource("lib/navigation/site-menu.ts"),
      readSource("app/our-leadership/page.tsx"),
      readSource("lib/medium-pages/content.ts"),
    ]);

  await fs.access(path.join(process.cwd(), "app/our-rabbis/page.tsx"));
  await assert.rejects(fs.access(path.join(process.cwd(), "app/our-rabbi/page.tsx")));

  assert.match(configSource, /source: "\/our-rabbi"[\s\S]*destination: "\/our-rabbis"/);
  assert.match(configSource, /source: "\/our-rabbis\.html"[\s\S]*destination: "\/our-rabbis"/);
  assert.match(pageSource, /const PATH = "\/our-rabbis"/);
  assert.match(pageSource, /canonical: PATH/);

  for (const source of [homepageSource, menuSource, leadershipSource, mediumPageSource]) {
    assert.equal(source.includes('"/our-rabbi"'), false);
  }

  const searchDocuments = await buildSearchDocuments();
  const rabbiSearchDocuments = searchDocuments.filter((record) => record.title.startsWith("Our Rabbis"));
  assert.equal(rabbiSearchDocuments.length, 1);
  assert.equal(rabbiSearchDocuments[0]?.path, "/our-rabbis");

  const pageRoutes = await listRoutesBySection("pages-sitemap");
  assert.equal(pageRoutes.includes("/our-rabbis"), true);
  assert.equal(pageRoutes.includes("/our-rabbi"), false);
});
