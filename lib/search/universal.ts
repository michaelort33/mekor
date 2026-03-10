import fs from "node:fs/promises";
import path from "node:path";

import { getNativeSearchIndex } from "@/lib/native-content/content-loader";
import type { NativeDocumentType } from "@/lib/content/types";
import { SITE_MENU, isNavGroup } from "@/lib/navigation/site-menu";

export type UniversalSearchDocument = {
  path: string;
  type: NativeDocumentType;
  title: string;
  description: string;
  excerpt: string;
  keywords: string[];
};

export type UniversalSearchResult = UniversalSearchDocument & {
  score: number;
};

let cachedDocuments: UniversalSearchDocument[] | null = null;
let cacheBuiltAt = 0;

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 31;
const INTERNAL_HREF_PATTERN = /href\s*[:=]\s*["'`]([^"'`]+)["'`]/g;
const LEGACY_TITLE_SUFFIX_PATTERN = /\s*\|\s*(mekor\s*3|mekor habracha(?:[^|]*)?)$/i;
const FORM_NOISE_PATTERN =
  /\b(first name|last name|email|message|submit|register now|register|rsvp|contact us|learn more|more info)\b/gi;
const SPACE_COLLAPSE_PATTERN = /\s+/g;
const TITLE_SEGMENT_NOISE = [
  /^mekor\s*3$/i,
  /^mekor habracha$/i,
  /^center city synagogue$/i,
];
const TITLE_OVERRIDES: Record<string, string> = {
  "/": "Home",
  "/donations": "Donations",
  "/membership": "Membership",
};

function normalizeQuery(raw: string) {
  return raw.toLowerCase().replace(/[^a-z0-9/\-\s]/g, " ").replace(/\s+/g, " ").trim();
}

function normalizePathname(raw: string) {
  if (!raw || !raw.startsWith("/")) {
    return "";
  }

  const [pathname] = raw.split(/[?#]/);
  if (!pathname) {
    return "";
  }

  if (pathname === "/") {
    return "/";
  }

  return pathname.replace(/\/+$/, "") || "/";
}

function cleanExcerpt(input: string) {
  return input
    .replace(/Skip to Main Content/gi, "")
    .replace(/Membership\s+Events\s+Donate\s+Kiddush\s+Center City Beit Midrash/gi, "")
    .replace(/Join Us\s+Davening\s+Who We Are\s+Kosher Restaurants\s+More\s+Support Mekor/gi, "")
    .replace(SPACE_COLLAPSE_PATTERN, " ")
    .trim();
}

function titleCaseFromSlug(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

function titleCaseWords(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function normalizeTitle(raw: string) {
  const normalized = raw.replace(LEGACY_TITLE_SUFFIX_PATTERN, "").replace(SPACE_COLLAPSE_PATTERN, " ").trim();
  if (!normalized) {
    return "";
  }

  const segments = normalized
    .split("|")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => !TITLE_SEGMENT_NOISE.some((pattern) => pattern.test(segment)));

  const uniqueSegments = [...new Set(segments)];
  return uniqueSegments.join(" | ");
}

function buildMenuLabelMap() {
  const map = new Map<string, string>();
  for (const item of SITE_MENU) {
    const itemPath = normalizePathname(item.href);
    if (itemPath && !map.has(itemPath)) {
      map.set(itemPath, item.label);
    }
    if (!isNavGroup(item)) {
      continue;
    }
    for (const child of item.children) {
      const childPath = normalizePathname(child.href);
      if (childPath && !map.has(childPath)) {
        map.set(childPath, child.label);
      }
    }
  }
  return map;
}

function deriveTitleFromPath(pathname: string) {
  if (pathname === "/") {
    return "Home";
  }
  const lastSegment = pathname.split("/").filter(Boolean).at(-1);
  return lastSegment ? titleCaseFromSlug(lastSegment) : pathname;
}

function pickPublicTitle(pathname: string, rawTitle: string, menuLabelMap: Map<string, string>) {
  const override = TITLE_OVERRIDES[pathname];
  if (override) {
    return override;
  }

  const normalized = normalizeTitle(rawTitle);
  if (normalized) {
    if (normalized === normalized.toLowerCase()) {
      return titleCaseWords(normalized);
    }
    return normalized;
  }

  const directMenuLabel = menuLabelMap.get(pathname);
  if (directMenuLabel) {
    return directMenuLabel;
  }

  return deriveTitleFromPath(pathname);
}

function pickPublicDescription(rawDescription: string, cleanValue: string) {
  const normalizedDescription = cleanExcerpt(rawDescription);
  if (normalizedDescription) {
    return normalizedDescription;
  }

  return cleanValue;
}

function pickPublicExcerpt(rawExcerpt: string, rawDescription: string, fallback: string) {
  const cleaned = cleanExcerpt(rawExcerpt || rawDescription || "");
  if (!cleaned) {
    return fallback;
  }

  const sanitized = cleaned.replace(FORM_NOISE_PATTERN, "").replace(SPACE_COLLAPSE_PATTERN, " ").trim();
  if (!sanitized) {
    return fallback;
  }

  if (sanitized.length <= 180) {
    return sanitized;
  }

  return `${sanitized.slice(0, 177).trimEnd()}...`;
}

function flattenMenuKeywords() {
  const map = new Map<string, Set<string>>();

  for (const item of SITE_MENU) {
    const current = map.get(item.href) ?? new Set<string>();
    current.add(item.label);
    map.set(item.href, current);

    if (!isNavGroup(item)) {
      continue;
    }

    for (const child of item.children) {
      const childTerms = map.get(child.href) ?? new Set<string>();
      childTerms.add(child.label);
      childTerms.add(item.label);
      map.set(child.href, childTerms);
    }
  }

  return map;
}

function getCoreRootPaths() {
  const roots = new Set<string>(["/"]);

  for (const item of SITE_MENU) {
    const normalized = normalizePathname(item.href);
    if (normalized) {
      roots.add(normalized);
    }

    if (!isNavGroup(item)) {
      continue;
    }

    for (const child of item.children) {
      const childPath = normalizePathname(child.href);
      if (childPath) {
        roots.add(childPath);
      }
    }
  }

  return roots;
}

function resolveAppPageFile(routePath: string) {
  if (routePath === "/") {
    return path.join(process.cwd(), "app/page.tsx");
  }

  const pathname = normalizePathname(routePath);
  if (!pathname) {
    return null;
  }

  return path.join(process.cwd(), "app", pathname.slice(1), "page.tsx");
}

async function extractOneHopLinks(routePath: string) {
  const filePath = resolveAppPageFile(routePath);
  if (!filePath) {
    return [];
  }

  try {
    const source = await fs.readFile(filePath, "utf8");
    const links = new Set<string>();

    for (const match of source.matchAll(INTERNAL_HREF_PATTERN)) {
      const href = normalizePathname(match[1] ?? "");
      if (!href || !href.startsWith("/")) {
        continue;
      }
      if (href.startsWith("/api/")) {
        continue;
      }
      links.add(href);
    }

    return [...links];
  } catch {
    return [];
  }
}

async function buildAllowedPaths() {
  const rootPaths = getCoreRootPaths();
  const allowed = new Set<string>(rootPaths);

  await Promise.all(
    [...rootPaths].map(async (rootPath) => {
      const oneHopLinks = await extractOneHopLinks(rootPath);
      for (const link of oneHopLinks) {
        allowed.add(link);
      }
    }),
  );

  return allowed;
}

async function buildUniversalDocuments() {
  const records = await getNativeSearchIndex();
  const menuKeywords = flattenMenuKeywords();
  const menuLabelMap = buildMenuLabelMap();
  const allowedPaths = await buildAllowedPaths();

  return records.map((record) => {
    const normalizedPath = normalizePathname(record.path);
    if (!allowedPaths.has(normalizedPath)) {
      return null;
    }

    const keywords = new Set<string>(record.terms);
    const menuTerms = menuKeywords.get(record.path);
    if (menuTerms) {
      for (const term of menuTerms) {
        keywords.add(term.toLowerCase());
      }
    }

    if (record.path !== "/") {
      keywords.add(record.path.replace(/^\//, "").replace(/-/g, " "));
    } else {
      keywords.add("home");
      keywords.add("homepage");
    }

    const publicTitle = pickPublicTitle(record.path, record.title || "", menuLabelMap);
    const fallbackDescription = `Open ${publicTitle}`;
    const publicExcerpt = pickPublicExcerpt(record.excerpt || "", record.description || "", fallbackDescription);
    const publicDescription = pickPublicDescription(record.description || "", fallbackDescription);

    return {
      path: record.path,
      type: record.type,
      title: publicTitle,
      description: publicDescription,
      excerpt: publicExcerpt,
      keywords: [...keywords],
    } satisfies UniversalSearchDocument;
  }).filter(Boolean) as UniversalSearchDocument[];
}

export async function getUniversalSearchDocuments(input?: { refresh?: boolean }) {
  const refresh = input?.refresh === true;
  const stale = Date.now() - cacheBuiltAt > CACHE_TTL_MS;

  if (!cachedDocuments || refresh || stale) {
    cachedDocuments = await buildUniversalDocuments();
    cacheBuiltAt = Date.now();
  }

  return cachedDocuments;
}

export async function searchUniversalDocuments(query: string, limit = 12) {
  const normalized = normalizeQuery(query);
  const terms = normalized.split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return [] as UniversalSearchResult[];
  }

  const documents = await getUniversalSearchDocuments();
  return documents
    .map((document) => {
      const title = document.title.toLowerCase();
      const path = document.path.toLowerCase();
      const description = document.description.toLowerCase();
      const excerpt = document.excerpt.toLowerCase();
      const keywords = document.keywords.join(" ").toLowerCase();

      const score = terms.reduce((total, term) => {
        if (title === term) return total + 20;
        if (path === `/${term}`) return total + 20;
        if (title.includes(term)) return total + 8;
        if (path.includes(term)) return total + 7;
        if (keywords.includes(term)) return total + 5;
        if (description.includes(term)) return total + 3;
        if (excerpt.includes(term)) return total + 2;
        return total;
      }, 0);

      return {
        ...document,
        score,
      };
    })
    .filter((document) => document.score > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, limit);
}

export async function getUniversalSearchIndexStats() {
  const documents = await getUniversalSearchDocuments();
  return {
    count: documents.length,
    builtAt: new Date(cacheBuiltAt || Date.now()).toISOString(),
  };
}

export { cleanExcerpt, normalizeQuery };
