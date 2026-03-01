import { load } from "cheerio";

import { listDocumentsByType } from "@/lib/mirror/loaders";
import type { PageDocument } from "@/lib/mirror/types";

export const KOSHER_NEIGHBORHOODS = [
  "center-city",
  "main-line-manyunk",
  "old-yorkroad-northeast",
  "cherry-hill",
  "unknown",
] as const;

export type KosherNeighborhood = (typeof KOSHER_NEIGHBORHOODS)[number];

export const KOSHER_NEIGHBORHOOD_LABELS: Record<KosherNeighborhood, string> = {
  "center-city": "Center City & Vicinity",
  "main-line-manyunk": "Main Line / Manyunk",
  "old-yorkroad-northeast": "Old York Road / Northeast",
  "cherry-hill": "Cherry Hill",
  unknown: "Other",
};

export const KOSHER_TAG_LABELS: Record<string, string> = {
  bakery: "Bakery",
  cafe: "Cafe",
  "ice-cream": "Ice Cream",
  restaurants: "Restaurants",
};

const CATEGORY_SLUG_TO_NEIGHBORHOOD: Record<string, KosherNeighborhood> = {
  "center-city": "center-city",
  "main-line-manyunk": "main-line-manyunk",
  "old-york-road-northeast": "old-yorkroad-northeast",
  "old-yorkroad-northeast": "old-yorkroad-northeast",
  "cherry-hill": "cherry-hill",
};

const PHONE_PATTERN = /(?:\+?1[\s\-().]*)?(?:\(?\d{3}\)?[\s\-().]*)\d{3}[\s\-().]*\d{4}/;
const DOMAIN_LINE_PATTERN = /\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/\S*)?/i;
const STREET_PATTERN =
  /\b(st(?:reet)?|ave(?:nue)?|road|rd|blvd|drive|dr|lane|ln|pike|suite|ste|unit|boulevard|way|plaza|pl)\b/i;

const FOOTER_PHONE = "+12155254246";
const POST_PATH_PREFIX = "/post/";

export type ExtractedKosherPlace = {
  slug: string;
  path: string;
  title: string;
  neighborhood: KosherNeighborhood;
  neighborhoodLabel: string;
  tags: string[];
  categoryPaths: string[];
  tagPaths: string[];
  address: string;
  phone: string;
  website: string;
  supervision: string;
  summary: string;
  locationHref: string;
  capturedAt: string;
  sourceJson: Record<string, unknown>;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanText(value: string) {
  return normalizeWhitespace(value.replace(/[\u200B-\u200D\uFEFF]/g, ""));
}

function normalizePath(value: string) {
  if (!value) {
    return "/";
  }

  if (value === "/") {
    return "/";
  }

  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function toPostSlug(path: string) {
  const raw = path.startsWith(POST_PATH_PREFIX) ? path.slice(POST_PATH_PREFIX.length) : path;
  const decoded = decodeURIComponent(raw);
  return decoded
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function canonicalizePagedPath(path: string) {
  return normalizePath(path).replace(/\/page\/\d+$/i, "");
}

function uniqueOrdered(values: string[]) {
  const deduped = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    if (!value || deduped.has(value)) {
      continue;
    }

    deduped.add(value);
    output.push(value);
  }

  return output;
}

function isLikelyHoursLine(line: string) {
  return /(?:\bmon(?:day)?\b|\btue(?:sday)?\b|\bwed(?:nesday)?\b|\bthu(?:rsday)?\b|\bfri(?:day)?\b|\bsat(?:urday)?\b|\bsun(?:day)?\b|everyday|last order|\b\d{1,2}\s*(?:am|pm)\b|\bclosed\b)/i.test(
    line,
  );
}

function isLikelyPhoneLine(line: string) {
  return PHONE_PATTERN.test(line) && !DOMAIN_LINE_PATTERN.test(line);
}

function extractPhoneNumber(text: string) {
  const match = text.match(PHONE_PATTERN);
  if (!match) {
    return "";
  }

  return normalizePhone(match[0] ?? "");
}

function normalizePhone(rawValue: string) {
  const raw = cleanText(rawValue.replace(/^tel:/i, ""));
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

function isPlaceWebsite(url: string) {
  return !/(?:maps\.google|google\.com\/maps|goo\.gl|instagram\.com|facebook\.com|youtube\.com|youtu\.be|mekorhabracha\.org)/i.test(
    url,
  );
}

function normalizeWebsite(rawValue: string) {
  const raw = cleanText(rawValue.replace(/^website:\s*/i, ""));
  if (!raw) {
    return "";
  }

  const direct = raw.match(DOMAIN_LINE_PATTERN)?.[0];
  if (!direct) {
    return "";
  }

  const candidate = /^https?:\/\//i.test(direct) ? direct : `https://${direct}`;

  try {
    const url = new URL(candidate);
    return url.toString();
  } catch {
    return "";
  }
}

function looksLikeAddress(line: string) {
  if (!/\d/.test(line)) {
    return false;
  }

  if (isLikelyPhoneLine(line) || isLikelyHoursLine(line)) {
    return false;
  }

  if (/supervision|website|view location|tags?:?/i.test(line)) {
    return false;
  }

  if (normalizeWebsite(line)) {
    return false;
  }

  return STREET_PATTERN.test(line) || /,\s*[A-Z]{2}\b/.test(line) || /philadelphia|bala|cherry hill|hatboro|wynnewood/i.test(line);
}

function parseCategoryPaths(links: string[]) {
  return uniqueOrdered(
    links
      .map((link) => normalizePath(link))
      .filter((link) => /^\/kosher-posts\/categories\/[^/]+(?:\/page\/\d+)?$/i.test(link))
      .map((link) => canonicalizePagedPath(link)),
  );
}

function parseTagPaths(links: string[]) {
  return uniqueOrdered(
    links
      .map((link) => normalizePath(link))
      .filter((link) => /^\/kosher-posts\/tags\/[^/]+(?:\/page\/\d+)?$/i.test(link))
      .map((link) => canonicalizePagedPath(link)),
  );
}

function parseTagLabels(tagPaths: string[]) {
  const slugs = tagPaths
    .map((path) => path.match(/^\/kosher-posts\/tags\/([^/]+)$/i)?.[1]?.toLowerCase() ?? "")
    .filter(Boolean);

  return uniqueOrdered(
    slugs.map((slug) => {
      const defined = KOSHER_TAG_LABELS[slug];
      if (defined) {
        return defined;
      }

      return slug
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }),
  );
}

function parseNeighborhood(categoryPaths: string[]) {
  for (const path of categoryPaths) {
    const slug = path.match(/^\/kosher-posts\/categories\/([^/]+)$/i)?.[1]?.toLowerCase();
    if (!slug) {
      continue;
    }

    const mapped = CATEGORY_SLUG_TO_NEIGHBORHOOD[slug];
    if (mapped) {
      return mapped;
    }
  }

  return "unknown" as const;
}

function extractDetails(document: PageDocument) {
  const $ = load(document.bodyHtml || document.renderHtml || "");
  const h1 = cleanText($("h1").first().text());
  const fallbackTitle = cleanText(document.title.replace(/\s*\|\s*Mekor 3$/i, ""));
  const title = h1 || fallbackTitle;
  const article = $("h1").first().closest("article");
  const scope = article.length > 0 ? article : $.root();

  const detailLines: string[] = [];
  const paragraphLines = scope
    .find("p")
    .toArray()
    .map((node) => cleanText($(node).text()))
    .filter(Boolean);

  for (const line of paragraphLines) {
    if (!line || /^updated:/i.test(line)) {
      continue;
    }

    if (/^tags:?$/i.test(line) || /^view location$/i.test(line)) {
      break;
    }

    if (detailLines.at(-1) === line) {
      continue;
    }

    detailLines.push(line);
  }

  const phoneFromLinks = scope
    .find("a[href^='tel:']")
    .toArray()
    .map((node) => normalizePhone($(node).attr("href") ?? ""))
    .find((value) => Boolean(value) && value !== FOOTER_PHONE);

  const phoneFromText = detailLines.map((line) => extractPhoneNumber(line)).find(Boolean);
  const phone = phoneFromLinks ?? phoneFromText ?? "";

  const supervision = detailLines.find((line) => /supervision/i.test(line)) ?? "";
  const locationHref =
    scope
      .find("a")
      .filter((_, node) => cleanText($(node).text()).toLowerCase() === "view location")
      .first()
      .attr("href") ?? "";

  const websiteFromLinks = uniqueOrdered(
    scope
      .find("a[href]")
      .toArray()
      .map((node) => $(node).attr("href") ?? "")
      .filter((href) => href.startsWith("http")),
  )
    .map((href) => normalizeWebsite(href))
    .find((href) => Boolean(href) && isPlaceWebsite(href));

  const websiteFromText = detailLines
    .map((line) => normalizeWebsite(line))
    .find((href) => Boolean(href) && isPlaceWebsite(href));

  const website = websiteFromLinks ?? websiteFromText ?? "";

  const address =
    detailLines.find(
      (line) => looksLikeAddress(line) && line !== phone && line !== supervision && line !== website,
    ) ?? "";

  const summary =
    detailLines.find(
      (line) =>
        line !== address &&
        line !== phone &&
        line !== supervision &&
        line !== website &&
        !isLikelyHoursLine(line) &&
        !/^note:/i.test(line) &&
        !normalizeWebsite(line),
    ) ?? "";

  return {
    title,
    address,
    phone,
    website,
    supervision,
    summary,
    locationHref,
    detailLines,
  };
}

function extractKosherPlace(document: PageDocument): ExtractedKosherPlace | null {
  if (!document.path.startsWith(POST_PATH_PREFIX)) {
    return null;
  }

  const links = (document.links ?? []).filter((link): link is string => typeof link === "string");
  const categoryPaths = parseCategoryPaths(links);
  const tagPaths = parseTagPaths(links);

  if (categoryPaths.length === 0 && tagPaths.length === 0) {
    return null;
  }

  const neighborhood = parseNeighborhood(categoryPaths);
  const details = extractDetails(document);
  const path = normalizePath(document.path);

  return {
    slug: toPostSlug(path),
    path,
    title: details.title,
    neighborhood,
    neighborhoodLabel: KOSHER_NEIGHBORHOOD_LABELS[neighborhood],
    tags: parseTagLabels(tagPaths),
    categoryPaths,
    tagPaths,
    address: details.address,
    phone: details.phone,
    website: details.website,
    supervision: details.supervision,
    summary: details.summary,
    locationHref: details.locationHref,
    capturedAt: document.capturedAt,
    sourceJson: {
      headings: document.headings,
      description: document.description,
      canonical: document.canonical,
      detailLines: details.detailLines,
      links: document.links,
      textHash: document.textHash,
    },
  };
}

function toDedupKey(row: ExtractedKosherPlace) {
  const title = cleanText(row.title).toLowerCase();
  const address = cleanText(row.address).toLowerCase();
  const location = cleanText(row.locationHref).toLowerCase();

  if (address || location) {
    return `${title}|${row.neighborhood}|${address}|${location}`;
  }

  return row.path.toLowerCase();
}

export async function loadExtractedKosherPlaces() {
  const docs = await listDocumentsByType("post");
  const extracted = docs
    .map((document) => extractKosherPlace(document))
    .filter((row): row is ExtractedKosherPlace => Boolean(row));

  const deduped = new Map<string, ExtractedKosherPlace>();
  for (const row of extracted) {
    const key = toDedupKey(row);
    const existing = deduped.get(key);

    if (!existing) {
      deduped.set(key, row);
      continue;
    }

    if (existing.capturedAt < row.capturedAt) {
      deduped.set(key, row);
    }
  }

  return [...deduped.values()].sort((a, b) => a.title.localeCompare(b.title));
}
