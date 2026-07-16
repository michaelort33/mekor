import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

async function readSource(relativePath: string) {
  return fs.readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("Rabbi Hirsch books and reflections retain the original wording and visible destinations", async () => {
  const source = await readSource("app/our-rabbi/page.tsx");

  assert.match(source, /engaging Torah classes/);
  assert.match(source, /Rabbi Hirsch's Reflections/);
  assert.match(source, /On Parkinson's Disease and Emunah/);
  assert.match(source, /brand: "substack"/);
  assert.match(source, /Pesach Without the Pain: A Practical Guide to the Laws and Practices of Passover/);
  assert.match(source, /Bringing Order to the Seder: A Modern Guide to the Traditional Passover Haggadah/);
  assert.match(source, /The Book of Life: A Transformative Guide to the High Holidays/);
  assert.equal(source.match(/brand: "amazon"/g)?.length, 4);
});

test("Rabbi links expose recognizable brands and external-link cues", async () => {
  const [pageSource, homepageSource, primitiveSource] = await Promise.all([
    readSource("app/our-rabbi/page.tsx"),
    readSource("app/page.tsx"),
    readSource("components/marketing/primitives.tsx"),
  ]);

  assert.match(pageSource, /A Quest for Our Times: The Louis Jacobs Haggadah \(Izzun Books, 2025\)/);
  assert.match(pageSource, /brand: "youtube"/);
  assert.match(pageSource, /brand: "facebook"/);
  assert.match(pageSource, /brand: "linkedin"/);
  assert.match(pageSource, /Book Talk with Rabbi Steven Gotlib/);
  assert.match(pageSource, /Explore and connect/);
  assert.match(pageSource, /Rabbi Hirsch community resources/);
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
