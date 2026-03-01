import { asc, desc } from "drizzle-orm";

import { getDb } from "@/db/client";
import { inTheNews } from "@/db/schema";
import {
  loadExtractedInTheNews,
  type ExtractedInTheNewsArticle,
} from "@/lib/in-the-news/extract";

export type ManagedInTheNewsArticle = {
  slug: string;
  path: string;
  title: string;
  publishedLabel: string;
  publishedAt: string | null;
  year: number | null;
  author: string;
  publication: string;
  excerpt: string;
  bodyText: string;
  sourceUrl: string;
  sourceCapturedAt: string | null;
};

export type InTheNewsFilters = {
  search?: string;
  year?: string;
  publication?: string;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeSearchValue(value: string | null | undefined) {
  return normalizeWhitespace(value ?? "").toLowerCase();
}

function normalizePublicationFilter(value: string | null | undefined) {
  const normalized = normalizeSearchValue(value);
  if (!normalized || normalized === "all") {
    return "all";
  }

  return normalized;
}

function normalizeYearFilter(value: string | null | undefined) {
  const normalized = normalizeWhitespace(value ?? "");
  if (!normalized || normalized === "all") {
    return null;
  }

  const year = Number.parseInt(normalized, 10);
  if (Number.isNaN(year)) {
    return null;
  }

  return year;
}

function toManagedInTheNewsArticle(row: {
  slug: string;
  path: string;
  title: string;
  publishedLabel: string;
  publishedAt: Date | null;
  year: number | null;
  author: string;
  publication: string;
  excerpt: string;
  bodyText: string;
  sourceUrl: string;
  sourceCapturedAt: Date | null;
}): ManagedInTheNewsArticle {
  return {
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
    sourceCapturedAt: row.sourceCapturedAt ? row.sourceCapturedAt.toISOString() : null,
  };
}

function matchesSearch(article: ManagedInTheNewsArticle, search: string) {
  if (!search) {
    return true;
  }

  const haystack = [
    article.title,
    article.excerpt,
    article.bodyText,
    article.author,
    article.publication,
    article.publishedLabel,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(search);
}

export function filterInTheNews(
  articles: ManagedInTheNewsArticle[],
  filters: InTheNewsFilters = {},
) {
  const search = normalizeSearchValue(filters.search);
  const publication = normalizePublicationFilter(filters.publication);
  const year = normalizeYearFilter(filters.year);

  return articles.filter((article) => {
    if (year !== null && article.year !== year) {
      return false;
    }

    if (publication !== "all" && normalizeSearchValue(article.publication) !== publication) {
      return false;
    }

    return matchesSearch(article, search);
  });
}

async function syncExtractedInTheNewsToDb(rows: ExtractedInTheNewsArticle[]) {
  const db = getDb();

  for (const row of rows) {
    await db
      .insert(inTheNews)
      .values({
        slug: row.slug,
        path: row.path,
        title: row.title,
        publishedLabel: row.publishedLabel,
        publishedAt: row.publishedAt,
        year: row.year,
        author: row.author,
        publication: row.publication,
        excerpt: row.excerpt,
        bodyText: row.bodyText,
        sourceUrl: row.sourceUrl,
        sourceCapturedAt: row.capturedAt ? new Date(row.capturedAt) : null,
        sourceType: "mirror",
        sourceJson: row.sourceJson,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: inTheNews.path,
        set: {
          slug: row.slug,
          title: row.title,
          publishedLabel: row.publishedLabel,
          publishedAt: row.publishedAt,
          year: row.year,
          author: row.author,
          publication: row.publication,
          excerpt: row.excerpt,
          bodyText: row.bodyText,
          sourceUrl: row.sourceUrl,
          sourceCapturedAt: row.capturedAt ? new Date(row.capturedAt) : null,
          sourceType: "mirror",
          sourceJson: row.sourceJson,
          updatedAt: new Date(),
        },
      });
  }
}

export async function getManagedInTheNews(filters: InTheNewsFilters = {}) {
  const extracted = await loadExtractedInTheNews();
  const extractedManaged = extracted.map((row) =>
    toManagedInTheNewsArticle({
      ...row,
      sourceCapturedAt: row.capturedAt ? new Date(row.capturedAt) : null,
    }),
  );

  if (!process.env.DATABASE_URL) {
    return filterInTheNews(extractedManaged, filters);
  }

  try {
    await syncExtractedInTheNewsToDb(extracted);

    const rows = await getDb()
      .select({
        slug: inTheNews.slug,
        path: inTheNews.path,
        title: inTheNews.title,
        publishedLabel: inTheNews.publishedLabel,
        publishedAt: inTheNews.publishedAt,
        year: inTheNews.year,
        author: inTheNews.author,
        publication: inTheNews.publication,
        excerpt: inTheNews.excerpt,
        bodyText: inTheNews.bodyText,
        sourceUrl: inTheNews.sourceUrl,
        sourceCapturedAt: inTheNews.sourceCapturedAt,
      })
      .from(inTheNews)
      .orderBy(desc(inTheNews.publishedAt), desc(inTheNews.year), asc(inTheNews.title));

    return filterInTheNews(
      rows.map((row) => toManagedInTheNewsArticle(row)),
      filters,
    );
  } catch {
    return filterInTheNews(extractedManaged, filters);
  }
}
