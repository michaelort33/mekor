import type { NativeSectionSitemap, NativeSitemapEntry } from "@/lib/content/native-content";
import { listSitemapEntriesBySection } from "@/lib/content/native-content";
import { getNewslettersFromStore } from "@/lib/newsletters/store";
import { absoluteSiteUrl } from "@/lib/seo/site";

export const SITEMAP_FILES = [
  "blog-posts-sitemap.xml",
  "event-pages-sitemap.xml",
  "dynamic-news-sitemap.xml",
  "pages-sitemap.xml",
  "community-content-sitemap.xml",
] as const;

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function formatLastModified(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function mergeEntry(
  entries: Map<string, NativeSitemapEntry>,
  path: string,
  lastModified?: string | Date | null,
) {
  const normalizedLastModified = formatLastModified(lastModified);
  const existing = entries.get(path);

  if (
    !existing ||
    (normalizedLastModified &&
      (!existing.lastModified || normalizedLastModified > existing.lastModified))
  ) {
    entries.set(path, {
      path,
      ...(normalizedLastModified ? { lastModified: normalizedLastModified } : {}),
    });
  }
}

export async function getStaticSitemapEntries(section: NativeSectionSitemap) {
  const entries = new Map<string, NativeSitemapEntry>();
  for (const entry of await listSitemapEntriesBySection(section)) {
    mergeEntry(entries, entry.path, entry.lastModified);
  }

  if (section === "pages-sitemap") {
    mergeEntry(entries, "/membership/apply");
  }

  return [...entries.values()].sort((left, right) => left.path.localeCompare(right.path));
}

export async function getCommunityContentSitemapEntries() {
  const entries = new Map<string, NativeSitemapEntry>();
  const newsletters = await getNewslettersFromStore();
  const newestNewsletterDate = newsletters[0]?.sentOn;

  mergeEntry(entries, "/newsletters", newestNewsletterDate);
  for (const newsletter of newsletters) {
    mergeEntry(entries, `/newsletters/${newsletter.slug}`, newsletter.sentOn);
  }

  mergeEntry(entries, "/ask-mekor");
  if (process.env.DATABASE_URL) {
    const { listPublicAskMekorQuestions } = await import("@/lib/ask-mekor/service");
    const { categories, items } = await listPublicAskMekorQuestions({ limit: 5000 });

    for (const item of items) {
      mergeEntry(entries, `/ask-mekor/questions/${item.slug}`, item.updatedAt);
    }

    for (const category of categories) {
      const latestCategoryUpdate = items
        .filter((item) => item.category.slug === category.slug)
        .map((item) => item.updatedAt)
        .sort((left, right) => right.getTime() - left.getTime())[0];
      mergeEntry(entries, `/ask-mekor/categories/${category.slug}`, latestCategoryUpdate);
    }
  }

  return [...entries.values()].sort((left, right) => left.path.localeCompare(right.path));
}

export function serializeUrlSet(entries: NativeSitemapEntry[]) {
  const rows = entries
    .map((entry) => {
      const lastModified = formatLastModified(entry.lastModified);
      return [
        "<url>",
        `<loc>${escapeXml(absoluteSiteUrl(entry.path))}</loc>`,
        ...(lastModified ? [`<lastmod>${escapeXml(lastModified)}</lastmod>`] : []),
        "</url>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    rows,
    "</urlset>",
  ].join("\n");
}

export function serializeSitemapIndex() {
  const rows = SITEMAP_FILES.map((file) =>
    ["<sitemap>", `<loc>${escapeXml(absoluteSiteUrl(`/${file}`))}</loc>`, "</sitemap>"].join(
      "\n",
    ),
  ).join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    rows,
    "</sitemapindex>",
  ].join("\n");
}

export const SITEMAP_RESPONSE_HEADERS = {
  "content-type": "application/xml; charset=utf-8",
  "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
};
