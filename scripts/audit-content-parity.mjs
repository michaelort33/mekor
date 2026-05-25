#!/usr/bin/env node
// One-off audit script: compares each mirrored page's headings against the
// rendered local route, reporting headings present on the live mirror but
// missing from the local page. Run while `npm run dev` is up on port 3000.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PAGE_DIR = "mirror-data/content/documents/page";
const ORIGIN = "http://localhost:3000";

const SKIP_SLUGS = new Set([
  // Old/duplicate mirrors not represented as live routes
  "about-5",
  "about-old",
  "centercity-southphillyeruvupdate-old",
  "membership-old",
  "letterfromisrael",
  "s-projects-side-by-side",
  "search-q-7bsearch_term-7d",
  "thank-you",
  "donation-thank-you-page",
  "events-page",
  "copy-of-pesach-at-mekor",
  // Paginated / faceted kosher-posts mirrors handled via base /kosher-posts
  "kosher-posts__page__2",
  "kosher-posts__page__3",
  "kosher-posts__page__4",
  "kosher-posts__page__5",
  "kosher-posts__page__6",
  "kosher-posts__page__e0b7a2b2-1782-4b0f-9b31-0691f453bd36",
  "kosher-posts__page__e1e8124f-530b-4ebb-aad4-a37696ce66af",
  "kosher-posts__search__-hash-4",
  "kosher-posts__search__2447",
  "kosher-posts__search__e0b7a2b2-1782-4b0f-9b31-0691f453bd36",
  "kosher-posts__search__e1e8124f-530b-4ebb-aad4-a37696ce66af",
  "kosher-posts__search__noindex",
]);

function normalise(value) {
  return value
    .replace(/​/g, "")
    .replace(/[­‌‍]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function fetchText(path) {
  const res = await fetch(`${ORIGIN}${path}`, { headers: { Accept: "text/html" } });
  if (!res.ok) return { status: res.status, html: "" };
  return { status: res.status, html: await res.text() };
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<svg[\s\S]*?<\/svg>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&(?:#39|#x27|apos|rsquo|lsquo);/gi, "'")
    .replace(/&(?:quot|#34|#x22|ldquo|rdquo);/gi, '"')
    .replace(/&(?:#(\d+)|#x([0-9a-f]+));/gi, (_, dec, hex) =>
      String.fromCodePoint(dec ? parseInt(dec, 10) : parseInt(hex, 16)),
    )
    .replace(/&[a-z]+;/gi, " ");
}

async function main() {
  const entries = readdirSync(PAGE_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ file: f, slug: f.replace(/--[a-f0-9]+\.json$/, "") }))
    .filter((e) => !SKIP_SLUGS.has(e.slug));

  const report = [];

  for (const entry of entries) {
    const data = JSON.parse(readFileSync(join(PAGE_DIR, entry.file), "utf8"));
    const path = data.path || `/${entry.slug}`;
    const route = path === "/home" ? "/" : path;
    const { status, html } = await fetchText(route);
    const local = normalise(stripHtml(html));
    const headings = (data.headings || []).map(normalise).filter(Boolean);
    const missing = headings.filter((h) => h && !local.includes(h));
    if (status !== 200 || missing.length) {
      report.push({ slug: entry.slug, route, status, missing });
    }
  }

  for (const row of report) {
    console.log(`\n[${row.status}] ${row.route}`);
    if (row.missing.length) {
      console.log("  missing headings:");
      for (const m of row.missing) console.log(`    - ${m}`);
    }
  }
  console.log(`\nChecked ${entries.length} pages; ${report.length} need review.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
