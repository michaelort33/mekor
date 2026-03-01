import assert from "node:assert/strict";
import test from "node:test";

import { loadExtractedInTheNews } from "../lib/in-the-news/extract";
import {
  filterInTheNews,
  type ManagedInTheNewsArticle,
} from "../lib/in-the-news/store";

function toManaged(rows: Awaited<ReturnType<typeof loadExtractedInTheNews>>) {
  return rows.map(
    (row): ManagedInTheNewsArticle => ({
      slug: row.slug,
      path: row.path,
      title: row.title,
      publishedLabel: row.publishedLabel,
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
      year: row.year,
      author: row.author,
      publication: row.publication,
      excerpt: row.excerpt,
      bodyText: row.bodyText,
      sourceUrl: row.sourceUrl,
      sourceCapturedAt: row.capturedAt,
    }),
  );
}

test("in-the-news extraction loads structured article rows", async () => {
  const rows = await loadExtractedInTheNews();

  assert.ok(rows.length >= 60, "expected at least 60 in-the-news records");
  assert.ok(rows.some((row) => row.path.startsWith("/news/")), "expected internal /news records");
  assert.ok(rows.some((row) => row.path.startsWith("http")), "expected external mention records");
  assert.ok(
    rows.every((row) => row.path.startsWith("/") || row.path.startsWith("http")),
    "each record should resolve to an internal path or external URL",
  );
  assert.ok(rows.every((row) => row.title.length > 0));
  assert.ok(rows.every((row) => row.excerpt.length > 0));
  assert.ok(rows.some((row) => row.publishedLabel.length > 0));
  assert.ok(rows.some((row) => row.publication.length > 0));
});

test("in-the-news filters apply search, publication, and year", async () => {
  const rows = toManaged(await loadExtractedInTheNews());

  const year = rows.find((row) => row.year)?.year;
  assert.ok(year, "expected at least one row with a year");

  const byYear = filterInTheNews(rows, { year: String(year) });
  assert.ok(byYear.length > 0);
  assert.ok(byYear.every((row) => row.year === year));

  const publication = rows.find((row) => row.publication)?.publication;
  assert.ok(publication, "expected at least one row with publication");

  const byPublication = filterInTheNews(rows, { publication });
  assert.ok(byPublication.length > 0);
  assert.ok(byPublication.every((row) => row.publication.toLowerCase() === publication.toLowerCase()));

  const firstWord = rows[0]?.title.split(/\s+/)[0] ?? "";
  const bySearch = filterInTheNews(rows, { search: firstWord });
  assert.ok(bySearch.length > 0);
  assert.ok(bySearch.some((row) => row.title.toLowerCase().includes(firstWord.toLowerCase())));
});

test("in-the-news extraction includes newer external mentions from /in-the-news page", async () => {
  const rows = await loadExtractedInTheNews();

  assert.ok(
    rows.some((row) => (row.year ?? 0) >= 2024),
    "expected at least one recent (2024+) mention from the in-the-news repeater feed",
  );
  assert.ok(
    rows.some((row) => row.sourceUrl.startsWith("http")),
    "expected at least one external source URL",
  );
});
