import assert from "node:assert/strict";
import test from "node:test";

import { GET as getRootSitemap } from "../app/sitemap.xml/route";

test("sitemap index includes member profiles sitemap entry", async () => {
  const response = await getRootSitemap();
  const xml = await response.text();

  assert.match(xml, /member-profiles-sitemap\.xml/);
});
