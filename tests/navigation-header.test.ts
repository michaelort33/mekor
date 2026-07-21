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

test("option 2a splits desktop navigation into utility and browse tiers", async () => {
  const [navigationSource, utilitySource, navCtaSource, menuSource] = await Promise.all([
    readSource("components/navigation/site-navigation.tsx"),
    readSource("components/navigation/desktop-utility-nav.tsx"),
    readSource("components/navigation/nav-cta.tsx"),
    readSource("lib/navigation/site-menu.ts"),
  ]);

  assert.match(navigationSource, /<DesktopUtilityNav/);
  assert.match(navigationSource, /items=\{DESKTOP_BROWSE_MENU\}/);
  assert.match(utilitySource, /aria-label="Quick links"/);
  assert.match(utilitySource, /linear-gradient\(180deg,#30699c_0%,#28618f_100%\)/);
  assert.match(utilitySource, /Join WhatsApp/);
  assert.match(menuSource, /DESKTOP_UTILITY_LINKS:[\s\S]*Davening[\s\S]*Events[\s\S]*Visit Us/);
  assert.match(menuSource, /DESKTOP_BROWSE_MENU:[\s\S]*MEMBERSHIP_MENU[\s\S]*KOSHER_GUIDE_MENU[\s\S]*WHO_WE_ARE_MENU[\s\S]*COMMUNITY_MENU/);
  assert.doesNotMatch(navCtaSource, /JOIN_US_LINK/);
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
