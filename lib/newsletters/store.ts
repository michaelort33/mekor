import { desc } from "drizzle-orm";

import { getDb } from "@/db/client";
import { newsletterIssues } from "@/db/schema";
import { sanitizeMirrorHtml } from "@/lib/mirror/html-security";
import { NEWSLETTERS } from "@/lib/newsletters/data";
import type { Newsletter, NewsletterSummary } from "@/lib/newsletters/model";

function nativeIssue(row: typeof newsletterIssues.$inferSelect): Newsletter {
  const imported = row.contentJson as Partial<Newsletter>;
  if (Array.isArray(imported.blocks)) {
    return { ...(imported as Newsletter), slug: row.slug };
  }
  return {
    slug: row.slug,
    campaignId: row.campaignId ? `native-${row.campaignId}` : `native-${row.id}`,
    title: row.title,
    category: row.category === "events" || row.category === "eruv" || row.category === "classes" || row.category === "community" ? row.category : "weekly",
    sentOn: row.publishedAt.toISOString().slice(0, 10),
    preview: row.previewText,
    coverImage: row.coverImage || null,
    readingMinutes: row.readingMinutes,
    searchText: row.searchText,
    toc: [],
    blocks: [],
    bodyHtml: sanitizeMirrorHtml(row.bodyHtml),
  };
}

export async function getNewslettersFromStore(): Promise<Newsletter[]> {
  let issues: (typeof newsletterIssues.$inferSelect)[] = [];
  if (process.env.DATABASE_URL) {
    try {
      issues = await getDb().select().from(newsletterIssues).orderBy(desc(newsletterIssues.publishedAt));
    } catch (error) {
      const cause = error && typeof error === "object" && "cause" in error ? error.cause : error;
      if (!(cause && typeof cause === "object" && "code" in cause && cause.code === "42P01")) throw error;
    }
  }
  const bySlug = new Map(NEWSLETTERS.map((issue) => [issue.slug, issue]));
  for (const row of issues) bySlug.set(row.slug, nativeIssue(row));
  return [...bySlug.values()].sort((a, b) => b.sentOn.localeCompare(a.sentOn));
}

export async function getNewsletterSummariesFromStore(): Promise<NewsletterSummary[]> {
  return (await getNewslettersFromStore()).map(({ slug, title, category, sentOn, preview, coverImage, readingMinutes, searchText }) => ({ slug, title, category, sentOn, preview, coverImage, readingMinutes, searchText }));
}

export async function getNewsletterFromStore(slug: string) {
  return (await getNewslettersFromStore()).find((issue) => issue.slug === slug) ?? null;
}

export async function getAdjacentNewslettersFromStore(slug: string) {
  const newsletters = await getNewslettersFromStore();
  const index = newsletters.findIndex((issue) => issue.slug === slug);
  return { newer: index > 0 ? newsletters[index - 1] : null, older: index >= 0 && index < newsletters.length - 1 ? newsletters[index + 1] : null };
}
