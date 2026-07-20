import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

async function readSource(relativePath: string) {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

test("public navigation has distinct top and scrolled visual states", async () => {
  const [navigationSource, brandSource] = await Promise.all([
    readSource("components/navigation/site-navigation.tsx"),
    readSource("components/navigation/nav-brand.tsx"),
  ]);

  assert.match(navigationSource, /window\.scrollY > 24/);
  assert.match(navigationSource, /data-scrolled=/);
  assert.match(navigationSource, /backdrop-blur-xl/);
  assert.match(navigationSource, /max-w-\[110rem\]/);
  assert.match(brandSource, /compact \? "h-7" : "h-8 sm:h-9"/);
});

test("desktop dropdown triggers highlight only while open", async () => {
  const desktopNavSource = await readSource("components/navigation/desktop-nav.tsx");

  assert.match(
    desktopNavSource,
    /isOpen && "bg-white\/85 font-semibold shadow-\[0_10px_24px_-18px_rgba\(15,23,42,0\.4\)\]"/,
  );
  assert.doesNotMatch(desktopNavSource, /groupActive/);
});

test("public headings keep balanced, word-safe wrapping", async () => {
  const [globalStyles, homepageSource, homepageStyles] = await Promise.all([
    readSource("app/globals.css"),
    readSource("app/page.tsx"),
    readSource("app/page.module.css"),
  ]);

  assert.match(globalStyles, /main:has\(> \[data-native-nav-root\]\) :is\(h1, h2, h3\)/);
  assert.match(globalStyles, /text-wrap: balance/);
  assert.match(homepageSource, /<span>Mekor<\/span>/);
  assert.match(homepageSource, /<span>Habracha<\/span>/);
  assert.match(homepageStyles, /\.heroTitle span \{[\s\S]*white-space: nowrap/);
});
