import archiveData from "@/lib/newsletters/generated/archive.json";
import type { Newsletter, NewsletterSummary } from "@/lib/newsletters/model";

export { NEWSLETTER_CATEGORY_LABELS, formatNewsletterDate } from "@/lib/newsletters/model";
export type {
  Newsletter,
  NewsletterBlock,
  NewsletterCategory,
  NewsletterContentNode,
  NewsletterSummary,
  NewsletterTocItem,
} from "@/lib/newsletters/model";

type NewsletterArchive = {
  source: string;
  importedAt: string;
  issueCount: number;
  assetCount: number;
  issues: Newsletter[];
};

export const NEWSLETTER_ARCHIVE = archiveData as NewsletterArchive;
export const NEWSLETTERS = NEWSLETTER_ARCHIVE.issues;

export function getNewslettersByDate(): Newsletter[] {
  return [...NEWSLETTERS].sort((a, b) => b.sentOn.localeCompare(a.sentOn));
}

export function getNewsletterSummaries(): NewsletterSummary[] {
  return getNewslettersByDate().map((item) => ({
    slug: item.slug,
    title: item.title,
    category: item.category,
    sentOn: item.sentOn,
    preview: item.preview,
    coverImage: item.coverImage,
    readingMinutes: item.readingMinutes,
    searchText: item.searchText,
  }));
}

export function getNewsletterBySlug(slug: string): Newsletter | null {
  return NEWSLETTERS.find((item) => item.slug === slug) ?? null;
}

export function getAdjacentNewsletters(slug: string) {
  const newsletters = getNewslettersByDate();
  const index = newsletters.findIndex((item) => item.slug === slug);
  return {
    newer: index > 0 ? newsletters[index - 1] : null,
    older: index >= 0 && index < newsletters.length - 1 ? newsletters[index + 1] : null,
  };
}
