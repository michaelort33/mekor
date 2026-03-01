import { load } from "cheerio";

import { getDocumentByPath, listDocumentsByType } from "@/lib/mirror/loaders";
import type { PageDocument } from "@/lib/mirror/types";
import { normalizePath } from "@/lib/mirror/url";

const NEWS_PATH_PREFIX = "/news/";
const IN_THE_NEWS_PAGE_PATH = "/in-the-news";
const MEKOR_HOST = "mekorhabracha.org";
const SOURCE_LINK_BLOCKLIST =
  /(?:mekorhabracha\.org|chat\.whatsapp\.com|instagram\.com|youtube\.com|facebook\.com|campaign-archive\.com)/i;

export type ExtractedInTheNewsArticle = {
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
  capturedAt: string;
  sourceJson: Record<string, unknown>;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripMarkdown(value: string) {
  return normalizeWhitespace(
    value
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, "$1")
      .replace(/\(([^)]+)\)\[(https?:\/\/[^\]]+)\]/gi, "$1")
      .replace(/https?:\/\/\S+/gi, ""),
  );
}

function normalizeTitle(value: string) {
  return normalizeWhitespace(value.replace(/\s*\|\s*Mekor\s*3$/i, ""));
}

function parsePublishedLine(value: string) {
  const normalized = normalizeWhitespace(value);
  const match = normalized.match(/^([A-Za-z]+\s+\d{1,2},\s*\d{4})(?:\s*[•-]\s*(.+))?$/);

  if (!match) {
    return {
      publishedLabel: "",
      publishedAt: null,
      year: null,
      author: "",
    };
  }

  const dateLabel = normalizeWhitespace(match[1] ?? "");
  const author = normalizeWhitespace(match[2] ?? "");
  const publishedAt = new Date(dateLabel);

  if (Number.isNaN(publishedAt.getTime())) {
    return {
      publishedLabel: normalized,
      publishedAt: null,
      year: null,
      author,
    };
  }

  return {
    publishedLabel: dateLabel,
    publishedAt,
    year: publishedAt.getUTCFullYear(),
    author,
  };
}

function sourceHostLabel(sourceUrl: string) {
  if (!sourceUrl) {
    return "";
  }

  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./i, "");
    return host;
  } catch {
    return "";
  }
}

function normalizePublicationValue(value: string) {
  const normalized = stripMarkdown(value)
    .replace(/^the\s+/i, "")
    .replace(/[()[\]"]/g, "")
    .trim();

  if (!normalized) {
    return "";
  }

  if (normalized.length > 48) {
    return "";
  }

  return normalized;
}

function parsePublication(bodyText: string, sourceUrl: string) {
  const normalized = stripMarkdown(bodyText);

  const patterns = [
    /published in (?:the )?([^,.:]+?)(?:,|:|\.|\s+which|\s+who|\s+quotes|$)/i,
    /published on (?:the )?([^,.:]+?)(?:,|:|\.|\s+which|\s+who|\s+quotes|$)/i,
    /article from (?:the )?([^,.:]+?)(?:,|:|\.|\s+which|\s+who|\s+quotes|$)/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match?.[1]) {
      continue;
    }

    const publication = normalizePublicationValue(match[1]);
    if (publication) {
      return publication;
    }
  }

  return sourceHostLabel(sourceUrl);
}

function buildExcerpt(bodyText: string) {
  const normalized = stripMarkdown(bodyText);
  if (!normalized) {
    return "";
  }

  if (normalized.length <= 280) {
    return normalized;
  }

  const clipped = normalized.slice(0, 280);
  const sentenceBreak = clipped.lastIndexOf(". ");
  if (sentenceBreak > 150) {
    return `${clipped.slice(0, sentenceBreak + 1)}`;
  }

  return `${clipped.trimEnd()}...`;
}

function sanitizeExternalUrl(candidate: string) {
  const trimmed = normalizeWhitespace(candidate).replace(/[\],);.]+$/, "");
  if (!/^https?:\/\//i.test(trimmed)) {
    return "";
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    return "";
  }
}

function normalizeInternalPath(candidate: string) {
  const trimmed = normalizeWhitespace(candidate);
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("/")) {
    const withoutHash = trimmed.split("#")[0] ?? trimmed;
    return normalizePath((withoutHash.split("?")[0] ?? withoutHash) || "/");
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return "";
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./i, "");
    if (host !== MEKOR_HOST) {
      return "";
    }

    return normalizePath(url.pathname || "/");
  } catch {
    return "";
  }
}

function parseShortDate(value: string) {
  const normalized = normalizeWhitespace(value);
  const match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!match) {
    return {
      publishedLabel: normalized,
      publishedAt: null,
      year: null,
    };
  }

  const month = Number.parseInt(match[1] ?? "", 10);
  const day = Number.parseInt(match[2] ?? "", 10);
  let year = Number.parseInt(match[3] ?? "", 10);
  if (year < 100) {
    year += 2000;
  }

  const publishedAt = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(publishedAt.getTime())) {
    return {
      publishedLabel: normalized,
      publishedAt: null,
      year: null,
    };
  }

  return {
    publishedLabel: new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(publishedAt),
    publishedAt,
    year,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parsePublicationFromSummary(summary: string, sourceUrl: string) {
  const normalized = normalizeWhitespace(summary);
  if (normalized) {
    const byDoubleDash = normalizePublicationValue(normalized.split("--")[0] ?? "");
    if (byDoubleDash) {
      return byDoubleDash;
    }

    const byHyphen = normalizePublicationValue(normalized.split(" - ")[0] ?? "");
    if (byHyphen) {
      return byHyphen;
    }
  }

  return parsePublication(summary, sourceUrl);
}

function extractInTheNewsMentionsPage(document: PageDocument): ExtractedInTheNewsArticle[] {
  const $ = load(document.bodyHtml || document.renderHtml || "");

  const rows: ExtractedInTheNewsArticle[] = [];
  $("#PAGES_CONTAINER .wixui-repeater__item").each((_, node) => {
    const item = $(node);
    const itemId = item.attr("id") || "";

    const paragraphs = item
      .find("p")
      .toArray()
      .map((paragraph) => stripMarkdown($(paragraph).text()))
      .filter(Boolean);

    const linkRecords = item
      .find("a[href]")
      .toArray()
      .map((linkNode) => ({
        href: normalizeWhitespace($(linkNode).attr("href") ?? ""),
        text: stripMarkdown($(linkNode).text()),
      }))
      .filter((link) => Boolean(link.href));

    const primaryLink = linkRecords.find(
      (link) => link.text.replace(/[\u200B-\u200D\uFEFF]/g, "").trim().length > 1,
    );
    if (!primaryLink) {
      return;
    }

    const internalPath = normalizeInternalPath(primaryLink.href);
    const sourceUrl = internalPath ? "" : sanitizeExternalUrl(primaryLink.href);
    const path = internalPath || sourceUrl;
    if (!path) {
      return;
    }

    const title = normalizeTitle(primaryLink.text || paragraphs[1] || "");
    if (!title) {
      return;
    }

    const published = parseShortDate(paragraphs[0] ?? "");
    const summary = normalizeWhitespace(paragraphs.slice(2).join(" "));
    const publication = parsePublicationFromSummary(summary, sourceUrl);

    const slug = internalPath.startsWith(NEWS_PATH_PREFIX)
      ? internalPath.slice(NEWS_PATH_PREFIX.length)
      : `${published.year ?? "unknown"}-${slugify(title)}`;

    rows.push({
      slug,
      path,
      title,
      publishedLabel: published.publishedLabel,
      publishedAt: published.publishedAt,
      year: published.year,
      author: "",
      publication,
      excerpt: buildExcerpt(summary || title),
      bodyText: summary || title,
      sourceUrl,
      capturedAt: document.capturedAt,
      sourceJson: {
        sourcePath: document.path,
        itemId,
        paragraphs,
        href: primaryLink.href,
      },
    });
  });

  return rows;
}

function pickSourceUrl(document: PageDocument) {
  const $ = load(document.bodyHtml || document.renderHtml || "");

  const links = $("#PAGES_CONTAINER a[href]")
    .toArray()
    .map((node) => sanitizeExternalUrl($(node).attr("href") ?? ""))
    .filter(Boolean);

  return (
    links.find((href) => !SOURCE_LINK_BLOCKLIST.test(href)) ?? ""
  );
}

function extractNewsBodyParagraphs(document: PageDocument) {
  const $ = load(document.bodyHtml || document.renderHtml || "");

  return $("#PAGES_CONTAINER p")
    .toArray()
    .map((node) => stripMarkdown($(node).text()))
    .filter(Boolean);
}

function stripLeadingTitle(text: string, title: string) {
  const normalizedText = normalizeWhitespace(text);
  const normalizedTitle = normalizeWhitespace(title);
  if (!normalizedText || !normalizedTitle) {
    return normalizedText;
  }

  const loweredText = normalizedText.toLowerCase();
  const loweredTitle = normalizedTitle.toLowerCase();
  if (!loweredText.startsWith(loweredTitle)) {
    return normalizedText;
  }

  return normalizeWhitespace(normalizedText.slice(normalizedTitle.length));
}

function extractInTheNewsArticle(document: PageDocument): ExtractedInTheNewsArticle | null {
  if (!document.path.startsWith(NEWS_PATH_PREFIX)) {
    return null;
  }

  const title = normalizeTitle(document.headings?.[0] || document.title);
  const paragraphs = extractNewsBodyParagraphs(document);
  const sourceUrl = pickSourceUrl(document);
  const published = parsePublishedLine(paragraphs[0] ?? "");
  const bodyText = stripLeadingTitle(
    normalizeWhitespace(paragraphs.slice(1).join(" ")),
    title,
  );
  const publication = parsePublication(bodyText, sourceUrl);

  return {
    slug: document.path.slice(NEWS_PATH_PREFIX.length),
    path: document.path,
    title,
    publishedLabel: published.publishedLabel,
    publishedAt: published.publishedAt,
    year: published.year,
    author: published.author,
    publication,
    excerpt: buildExcerpt(bodyText),
    bodyText,
    sourceUrl,
    capturedAt: document.capturedAt,
    sourceJson: {
      canonical: document.canonical,
      description: document.description,
      headings: document.headings,
      links: document.links,
      textHash: document.textHash,
    },
  };
}

export async function loadExtractedInTheNews() {
  const docs = await listDocumentsByType("news");
  const newsArticles = docs
    .map((document) => extractInTheNewsArticle(document))
    .filter((row): row is ExtractedInTheNewsArticle => Boolean(row));
  const mentionsDocument = await getDocumentByPath(IN_THE_NEWS_PAGE_PATH);
  const mentions =
    mentionsDocument ? extractInTheNewsMentionsPage(mentionsDocument) : [];
  const extracted = [...newsArticles, ...mentions];

  const deduped = new Map<string, ExtractedInTheNewsArticle>();
  for (const row of extracted) {
    deduped.set(row.path, row);
  }

  return [...deduped.values()].sort((a, b) => {
    const aTime = a.publishedAt?.getTime() ?? new Date(a.capturedAt).getTime();
    const bTime = b.publishedAt?.getTime() ?? new Date(b.capturedAt).getTime();
    return bTime - aTime;
  });
}
