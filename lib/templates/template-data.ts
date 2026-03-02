import { cache } from "react";
import { load } from "cheerio";

import {
  getNativeDocumentByPath,
  normalizePath,
  getPathVariants,
  loadNativeContentIndex,
  type NativeDocumentType,
  type NativePageDocument,
} from "@/lib/native-content/content-loader";

const FOOTER_PHONE = "+12155254246";
const PHONE_PATTERN = /(?:\+?1[\s\-().]*)?(?:\(?\d{3}\)?[\s\-().]*)\d{3}[\s\-().]*\d{4}/;
const DOMAIN_PATTERN =
  /\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s]*)?/i;
const STREET_PATTERN =
  /\b(st(?:reet)?|ave(?:nue)?|road|rd|blvd|drive|dr|lane|ln|pike|suite|ste|unit|boulevard|way|plaza|pl)\b/i;
const INTERNAL_HOSTS = new Set(["mekorhabracha.org", "www.mekorhabracha.org"]);
const EXTERNAL_SOURCE_BLOCKLIST =
  /(?:mekorhabracha\.org|chat\.whatsapp\.com|instagram\.com|youtube\.com|facebook\.com|campaign-archive\.com)/i;

export type TemplateLink = {
  href: string;
  label: string;
};

export type TemplateFact = {
  label: string;
  value: string;
  href?: string;
};

export type ArticleTemplateData = {
  type: "post" | "news";
  path: string;
  title: string;
  subtitle: string;
  heroImage: string | null;
  metadata: string[];
  facts: TemplateFact[];
  body: string[];
  categories: TemplateLink[];
  tags: TemplateLink[];
  sourceUrl: string | null;
};

export type EventTemplateData = {
  path: string;
  title: string;
  subtitle: string;
  heroImage: string | null;
  shortDate: string;
  location: string;
  timeLabel: string;
  isClosed: boolean;
  about: string[];
  seeOtherEventsHref: string;
};

export type ProfileTemplateData = {
  path: string;
  title: string;
  subtitle: string;
  profileName: string;
  postCount: number | null;
  featuredPosts: TemplateLink[];
};

export type ArchiveTemplateData = {
  type: "category" | "tag";
  path: string;
  title: string;
  subtitle: string;
  entries: Array<{
    path: string;
    title: string;
    description: string;
  }>;
  currentPage: number;
  prevPageHref: string | null;
  nextPageHref: string | null;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanText(value: string | null | undefined) {
  return normalizeWhitespace((value ?? "").replace(/[\u200B-\u200D\uFEFF]/g, ""));
}

function cleanDocTitle(value: string) {
  return cleanText(value.replace(/\s*\|\s*Mekor\s*3$/i, ""));
}

function uniqueOrdered(values: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    if (!value || seen.has(value)) {
      continue;
    }

    seen.add(value);
    output.push(value);
  }

  return output;
}

function decodeSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function toTitleCase(value: string) {
  return value
    .split("-")
    .map((part) =>
      part.length > 0 ? `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}` : "",
    )
    .join(" ")
    .trim();
}

function pathLabel(pathValue: string) {
  const segment = pathValue.split("/").filter(Boolean).at(-1) ?? pathValue;
  return toTitleCase(decodeSegment(segment));
}

function normalizePhone(value: string) {
  const raw = cleanText(value.replace(/^tel:/i, ""));
  if (!raw) {
    return "";
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  return raw;
}

function formatPhone(value: string) {
  const normalized = normalizePhone(value);
  const digits = normalized.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return normalized;
}

function isLikelyHoursLine(line: string) {
  return /(?:\bmon(?:day)?\b|\btue(?:sday)?\b|\bwed(?:nesday)?\b|\bthu(?:rsday)?\b|\bfri(?:day)?\b|\bsat(?:urday)?\b|\bsun(?:day)?\b|everyday|last order|\b\d{1,2}\s*(?:am|pm)\b|\bclosed\b)/i.test(
    line,
  );
}

function isLikelyPhoneLine(line: string) {
  return PHONE_PATTERN.test(line) && !DOMAIN_PATTERN.test(line);
}

function normalizeWebsite(value: string) {
  const normalized = cleanText(value.replace(/^website:\s*/i, ""));
  if (!normalized) {
    return "";
  }

  const match = normalized.match(DOMAIN_PATTERN)?.[0] ?? "";
  if (!match) {
    return "";
  }

  const candidate = /^https?:\/\//i.test(match) ? match : `https://${match}`;
  try {
    return new URL(candidate).toString();
  } catch {
    return "";
  }
}

function isPlaceWebsite(url: string) {
  return !/(?:maps\.google|google\.com\/maps|goo\.gl|instagram\.com|facebook\.com|youtube\.com|youtu\.be|mekorhabracha\.org)/i.test(
    url,
  );
}

function looksLikeAddress(line: string) {
  if (!/\d/.test(line) || isLikelyPhoneLine(line) || isLikelyHoursLine(line)) {
    return false;
  }

  if (/supervision|website|view location|tags?:?/i.test(line)) {
    return false;
  }

  if (normalizeWebsite(line)) {
    return false;
  }

  return (
    STREET_PATTERN.test(line) ||
    /,\s*[A-Z]{2}\b/.test(line) ||
    /philadelphia|bala|cherry hill|hatboro|wynnewood/i.test(line)
  );
}

function parsePublishedLine(value: string) {
  const normalized = cleanText(value);
  const match = normalized.match(/^([A-Za-z]+\s+\d{1,2},\s*\d{4})(?:\s*[•-]\s*(.+))?$/);

  if (!match) {
    return {
      publishedLabel: "",
      author: "",
    };
  }

  return {
    publishedLabel: cleanText(match[1] ?? ""),
    author: cleanText(match[2] ?? ""),
  };
}

function sourceUrlLabel(sourceUrl: string) {
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./i, "");
  } catch {
    return sourceUrl;
  }
}

function splitHtmlByBreaks(html: string) {
  if (!html) {
    return [];
  }

  return html
    .split(/<br\s*\/?>/gi)
    .map((chunk) => cleanText(load(`<div>${chunk}</div>`)("div").text()))
    .filter(Boolean);
}

function isInternalUrl(value: string) {
  try {
    const parsed = new URL(value);
    return INTERNAL_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

function toRelativePathIfInternal(value: string) {
  if (value.startsWith("/")) {
    return normalizePath(value);
  }

  try {
    const parsed = new URL(value);
    if (!INTERNAL_HOSTS.has(parsed.hostname)) {
      return "";
    }
    return normalizePath(parsed.pathname);
  } catch {
    return "";
  }
}

function cleanContentLines(lines: string[], title: string) {
  const filtered = lines
    .map((line) => cleanText(line))
    .filter(Boolean)
    .filter((line) => line.toLowerCase() !== title.toLowerCase())
    .filter((line) => !/^updated:/i.test(line))
    .filter((line) => !/^view location$/i.test(line))
    .filter((line) => !/^tags?:?$/i.test(line));

  return uniqueOrdered(filtered);
}

function pathTitleOrFallback(pathValue: string, title: string) {
  if (title) {
    return title;
  }

  return pathLabel(pathValue);
}

const loadArchivePathSet = cache(async (type: NativeDocumentType) => {
  const index = await loadNativeContentIndex();
  return new Set(
    index
      .filter((entry) => entry.type === type)
      .map((entry) => getPathVariants(entry.path)[0] ?? entry.path)
      .filter(Boolean),
  );
});

export function buildArticleTemplateData(document: NativePageDocument): ArticleTemplateData {
  const $ = load(document.bodyHtml || document.renderHtml || "");
  const root =
    document.type === "post"
      ? $('[data-hook="post"]').first()
      : $("#PAGES_CONTAINER").first().length > 0
        ? $("#PAGES_CONTAINER").first()
        : $("body").first();
  const title =
    cleanText($('[data-hook="post-title"]').first().text()) ||
    cleanText($('[data-hook="post-page-root"] h1').first().text()) ||
    cleanText($("h1").first().text()) ||
    cleanDocTitle(document.title);

  const paragraphNodes = root.find("p").toArray();
  const paragraphText = paragraphNodes.map((node) => cleanText($(node).text())).filter(Boolean);
  const dedupedParagraphs = uniqueOrdered(paragraphText);

  if (document.type === "post") {
    const updatedLine = dedupedParagraphs.find((line) => /^updated:/i.test(line)) ?? "";
    const telHref = root
      .find("a[href^='tel:']")
      .toArray()
      .map((node) => normalizePhone($(node).attr("href") ?? ""))
      .find((value) => value && value !== FOOTER_PHONE);
    const phoneFromText = dedupedParagraphs
      .map((line) => normalizePhone(line.match(PHONE_PATTERN)?.[0] ?? ""))
      .find(Boolean);
    const phone = telHref || phoneFromText || "";

    const websiteFromLinks = uniqueOrdered(
      root
        .find("a[href]")
        .toArray()
        .map((node) => cleanText($(node).attr("href") ?? ""))
        .filter((href) => /^https?:\/\//i.test(href)),
    )
      .map((href) => normalizeWebsite(href))
      .find((href) => href && isPlaceWebsite(href));

    const websiteFromText = dedupedParagraphs
      .map((line) => normalizeWebsite(line))
      .find((href) => href && isPlaceWebsite(href));
    const website = websiteFromLinks || websiteFromText || "";

    const supervision = dedupedParagraphs.find((line) => /supervision/i.test(line)) ?? "";
    const locationHref =
      root
        .find("a[href]")
        .filter((_, node) => cleanText($(node).text()).toLowerCase() === "view location")
        .first()
        .attr("href") ?? "";
    const address =
      dedupedParagraphs.find(
        (line) =>
          looksLikeAddress(line) &&
          line !== phone &&
          line !== supervision &&
          line !== website,
      ) ?? "";

    const contentLines = cleanContentLines(dedupedParagraphs, title).filter(
      (line) =>
        line !== address &&
        line !== phone &&
        line !== supervision &&
        line !== website &&
        !isLikelyHoursLine(line),
    );

    const facts: TemplateFact[] = [];
    if (updatedLine) {
      facts.push({
        label: "Updated",
        value: updatedLine.replace(/^updated:\s*/i, "").trim(),
      });
    }
    if (address) {
      facts.push({
        label: "Address",
        value: address,
      });
    }
    if (phone) {
      facts.push({
        label: "Phone",
        value: formatPhone(phone),
        href: `tel:${phone}`,
      });
    }
    if (website) {
      facts.push({
        label: "Website",
        value: sourceUrlLabel(website),
        href: website,
      });
    }
    if (supervision) {
      facts.push({
        label: "Supervision",
        value: supervision,
      });
    }
    if (locationHref) {
      const relativeOrAbsolute = toRelativePathIfInternal(locationHref) || locationHref;
      facts.push({
        label: "Map",
        value: "View Location",
        href: relativeOrAbsolute,
      });
    }

    const categoryLinks = uniqueOrdered(
      (document.links ?? [])
        .map((link) => normalizePath(link))
        .filter((link) => /^\/kosher-posts\/categories\/[^/]+(?:\/page\/\d+)?$/i.test(link))
        .map((link) => link.replace(/\/page\/\d+$/i, "")),
    ).map((href) => ({
      href,
      label: pathLabel(href),
    }));

    const tagLinks = uniqueOrdered(
      (document.links ?? [])
        .map((link) => normalizePath(link))
        .filter((link) => /^\/kosher-posts\/tags\/[^/]+(?:\/page\/\d+)?$/i.test(link))
        .map((link) => link.replace(/\/page\/\d+$/i, "")),
    ).map((href) => ({
      href,
      label: pathLabel(href),
    }));

    const heroImage =
      root.find('[data-hook="post-hero-image"] img').first().attr("src") ||
      root.find('[data-hook="figure-IMAGE"] img').first().attr("src") ||
      null;

    const metadata = [updatedLine].filter(Boolean);
    const subtitle = document.description || "Community update from Mekor Habracha.";

    return {
      type: "post",
      path: document.path,
      title: pathTitleOrFallback(document.path, title),
      subtitle: cleanText(subtitle),
      heroImage,
      metadata,
      facts,
      body: contentLines.length > 0 ? contentLines : [cleanText(document.description)].filter(Boolean),
      categories: categoryLinks,
      tags: tagLinks,
      sourceUrl: null,
    };
  }

  const publishedMeta = parsePublishedLine(dedupedParagraphs[0] ?? "");
  const contentLines = cleanContentLines(
    paragraphNodes
      .slice(1)
      .flatMap((node) => splitHtmlByBreaks($(node).html() ?? ""))
      .filter(Boolean),
    title,
  );

  const sourceUrl =
    uniqueOrdered(
      (document.links ?? [])
        .map((link) => cleanText(link))
        .filter((link) => /^https?:\/\//i.test(link) && !EXTERNAL_SOURCE_BLOCKLIST.test(link)),
    )[0] ?? "";

  const metadata = [publishedMeta.publishedLabel, publishedMeta.author].filter(Boolean);

  return {
    type: "news",
    path: document.path,
    title: pathTitleOrFallback(document.path, title),
    subtitle:
      cleanText(document.description) ||
      "Press coverage and community stories connected to Mekor Habracha.",
    heroImage: null,
    metadata,
    facts:
      sourceUrl && !isInternalUrl(sourceUrl)
        ? [
            {
              label: "Source",
              value: sourceUrlLabel(sourceUrl),
              href: sourceUrl,
            },
          ]
        : [],
    body: contentLines.length > 0 ? contentLines : [cleanText(document.description)].filter(Boolean),
    categories: [],
    tags: [],
    sourceUrl: sourceUrl || null,
  };
}

export function buildEventTemplateData(document: NativePageDocument): EventTemplateData {
  const $ = load(document.bodyHtml || document.renderHtml || "");

  const title =
    cleanText($('[data-hook="event-title"]').first().text()) ||
    cleanText($("h1").first().text()) ||
    cleanDocTitle(document.title);
  const shortDate = cleanText($('[data-hook="event-short-date"]').first().text());
  const location = cleanText($('[data-hook="event-short-location"]').first().text());
  const timeLabel = cleanText($('[data-hook="event-full-date"]').first().text());
  const closedText = cleanText($('[data-hook="closed-registration"]').first().text());
  const isClosed =
    Boolean($('[data-hook="closed-registration"]').first().length) ||
    /registration is closed/i.test(closedText) ||
    /registration is closed/i.test(document.text);

  const aboutLines = uniqueOrdered(
    $('[data-hook="about"]')
      .find("p")
      .toArray()
      .flatMap((node) => splitHtmlByBreaks($(node).html() ?? ""))
      .map((line) => cleanText(line))
      .filter(Boolean),
  );

  const eventImage = $('[data-hook="event-image"]').find("img").first().attr("src") ?? null;

  return {
    path: document.path,
    title: pathTitleOrFallback(document.path, title),
    subtitle: cleanText(document.description) || "Event details and schedule.",
    heroImage: eventImage,
    shortDate,
    location,
    timeLabel,
    isClosed,
    about: aboutLines.length > 0 ? aboutLines : [cleanText(document.description)].filter(Boolean),
    seeOtherEventsHref: "/events",
  };
}

export async function buildProfileTemplateData(
  document: NativePageDocument,
): Promise<ProfileTemplateData> {
  const $ = load(document.bodyHtml || document.renderHtml || "");
  const h1 = cleanText($("h1").first().text());
  const rawMemberName = cleanText($('[data-hook="ProfileCard-memberName"]').first().text());
  const memberName = cleanText(rawMemberName.replace(/editoradmin|editor|admin/gi, ""));
  const pathParts = document.path.split("/").filter(Boolean);
  const inferredName = decodeSegment(pathParts[1] ?? "");
  const profileName = h1 || memberName || inferredName || cleanDocTitle(document.title);

  const postCountMatch = $("h2, h3")
    .toArray()
    .map((node) => cleanText($(node).text()))
    .join(" ")
    .match(/posts?\s*\((\d+)\)/i);
  const postCount = postCountMatch ? Number.parseInt(postCountMatch[1] ?? "", 10) : null;

  const postPaths = uniqueOrdered(
    (document.links ?? [])
      .map((link) => toRelativePathIfInternal(link) || normalizePath(link))
      .filter((href) => href.startsWith("/post/")),
  );

  const featuredPosts = await Promise.all(
    postPaths.slice(0, 12).map(async (pathValue) => {
      const linked = await getNativeDocumentByPath(pathValue);
      return {
        href: pathValue,
        label: cleanDocTitle(linked?.title ?? "") || pathLabel(pathValue),
      };
    }),
  );

  return {
    path: document.path,
    title: pathTitleOrFallback(document.path, profileName),
    subtitle: cleanText(document.description) || "Profile and recent posts.",
    profileName,
    postCount: Number.isNaN(postCount ?? Number.NaN) ? null : postCount,
    featuredPosts,
  };
}

export async function buildArchiveTemplateData(
  document: NativePageDocument,
): Promise<ArchiveTemplateData> {
  const normalizedPath = normalizePath(document.path);
  const type = normalizedPath.includes("/kosher-posts/categories/") ? "category" : "tag";
  const currentPage = Number.parseInt(normalizedPath.match(/\/page\/(\d+)$/)?.[1] ?? "1", 10);
  const pageNumber = Number.isNaN(currentPage) ? 1 : currentPage;
  const basePath = normalizedPath.replace(/\/page\/\d+$/i, "");
  const archiveType: NativeDocumentType = type === "category" ? "category" : "tag";
  const archivePathSet = await loadArchivePathSet(archiveType);

  const postPaths = uniqueOrdered(
    (document.links ?? [])
      .map((href) => toRelativePathIfInternal(href) || normalizePath(href))
      .filter((href) => href.startsWith("/post/")),
  );

  const entries = await Promise.all(
    postPaths.map(async (pathValue) => {
      const post = await getNativeDocumentByPath(pathValue);
      return {
        path: pathValue,
        title: cleanDocTitle(post?.title ?? "") || pathLabel(pathValue),
        description: cleanText(post?.description ?? ""),
      };
    }),
  );

  const prevCandidate = pageNumber <= 2 ? basePath : `${basePath}/page/${pageNumber - 1}`;
  const nextCandidate = `${basePath}/page/${pageNumber + 1}`;

  const prevPageHref =
    pageNumber > 1 && archivePathSet.has(normalizePath(prevCandidate)) ? prevCandidate : null;
  const nextPageHref = archivePathSet.has(normalizePath(nextCandidate)) ? nextCandidate : null;

  return {
    type,
    path: normalizedPath,
    title: cleanDocTitle(document.title) || pathLabel(basePath),
    subtitle:
      cleanText(document.description) ||
      (type === "category"
        ? "Browse kosher listings in this neighborhood."
        : "Browse kosher listings for this tag."),
    entries,
    currentPage: pageNumber,
    prevPageHref,
    nextPageHref,
  };
}
