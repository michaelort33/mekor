#!/usr/bin/env node
// Quick layout-health sweep: fetches each route, runs server-rendered HTML
// through cheerio-free regex checks, and flags pages where rendered HTML
// looks broken (missing main landmark, no h1, server-side error markers).

import { readFileSync } from "node:fs";

const ROUTES = [
  "/",
  "/about-us",
  "/our-rabbis",
  "/our-leadership",
  "/leadership",
  "/our-communities",
  "/philly-jewish-community",
  "/davening",
  "/visit-us",
  "/contact-us",
  "/donations",
  "/membership",
  "/membership/apply",
  "/auxiliary-membership",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/search",
  "/events",
  "/kiddush",
  "/from-the-rabbi-s-desk",
  "/in-the-news",
  "/israel",
  "/mekor-bulletin-board",
  "/mekorcouples",
  "/testimonials",
  "/team-4",
  "/community",
  "/center-city",
  "/cherry-hill",
  "/main-line-manyunk",
  "/old-yorkroad-northeast",
  "/old-kosher-restaurants",
  "/kosher-map",
  "/kosher-posts",
  "/ask-mekor",
  "/general-5",
  "/center-city-beit-midrash",
  "/copy-of-center-city-beit-midrash",
];

async function fetchOne(path) {
  try {
    const res = await fetch(`http://localhost:3000${path}`, {
      redirect: "follow",
      headers: { Accept: "text/html" },
    });
    const html = await res.text();
    return {
      path,
      status: res.status,
      url: res.url,
      hasMain: /<main\b/.test(html),
      hasH1: /<h1\b/.test(html),
      hasFooterSubscribe: /[Ss]ubscribe to our weekly newsletter/.test(html),
      hasErrorMarker: /This page could not be found|Application error/i.test(html),
      htmlLength: html.length,
    };
  } catch (err) {
    return { path, error: err.message };
  }
}

const results = [];
for (const route of ROUTES) {
  results.push(await fetchOne(route));
}

const problems = results.filter(
  (r) => r.error || r.status >= 400 || !r.hasMain || !r.hasH1 || r.hasErrorMarker || !r.hasFooterSubscribe,
);

if (!problems.length) {
  console.log(`All ${results.length} routes render with <main>, <h1>, no error markers, and a newsletter footer.`);
} else {
  for (const p of problems) {
    console.log(JSON.stringify(p));
  }
  console.log(`\n${problems.length} of ${results.length} routes flagged.`);
}
