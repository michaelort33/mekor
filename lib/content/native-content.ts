import documentsData from "@/lib/content/generated/documents.json";
import indexData from "@/lib/content/generated/index.json";
import routesData from "@/lib/content/generated/routes.json";
import searchData from "@/lib/content/generated/search.json";
import templatesData from "@/lib/content/generated/templates.json";
import type {
  NativeAliasRecord,
  NativeContentDocument,
  NativeContentIndexRecord,
  NativeDocumentType,
  NativeGeneratedRouteData,
  NativeSearchIndexRecord,
  NativeTemplateRecord,
} from "@/lib/content/types";

export type NativeSectionSitemap =
  | "blog-categories-sitemap"
  | "blog-posts-sitemap"
  | "event-pages-sitemap"
  | "dynamic-news-sitemap"
  | "pages-sitemap";

const documents = documentsData as NativeContentDocument[];
const index = indexData as NativeContentIndexRecord[];
const routeData = routesData as NativeGeneratedRouteData;
const searchRecords = searchData as NativeSearchIndexRecord[];
const templateRecords = templatesData as NativeTemplateRecord[];

function isRetiredKosherBrowsePath(pathValue: string) {
  return pathValue.startsWith("/kosher-posts/categories/") || pathValue.startsWith("/kosher-posts/tags/");
}

export function normalizePath(rawPath: string) {
  if (!rawPath || rawPath === "") {
    return "/";
  }

  const input = rawPath.startsWith("/") ? rawPath : "/" + rawPath;
  const [pathname, query = ""] = input.split("?");
  const cleanPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "") || "/";

  if (!query) {
    return cleanPath;
  }

  return cleanPath + "?" + query;
}

export function getPathVariants(pathValue: string) {
  const normalized = normalizePath(pathValue);
  const [pathname, query = ""] = normalized.split("?");
  const variants = new Set<string>([normalized]);

  const add = (candidatePathname: string) => {
    const clean = normalizePath(query ? candidatePathname + "?" + query : candidatePathname);
    variants.add(clean);
  };

  try {
    add(decodeURI(pathname));
  } catch {}

  try {
    add(encodeURI(pathname));
  } catch {}

  return [...variants];
}

const documentByPath = new Map<string, NativeContentDocument>();
for (const document of documents) {
  for (const variant of getPathVariants(document.path)) {
    if (!documentByPath.has(variant)) {
      documentByPath.set(variant, document);
    }
  }
}

const templateByPath = new Map<string, NativeTemplateRecord>();
for (const record of templateRecords) {
  for (const variant of getPathVariants(record.document.path)) {
    if (!templateByPath.has(variant)) {
      templateByPath.set(variant, record);
    }
  }
}

const twoHundred = new Set<string>();
for (const record of [...routeData.canonical, ...routeData.reachable]) {
  for (const variant of getPathVariants(record.path)) {
    twoHundred.add(variant);
  }
}

const overrides = new Map<string, number>();
for (const record of routeData.statusOverrides) {
  for (const variant of getPathVariants(record.path)) {
    overrides.set(variant, record.status);
  }
}

const aliases = new Map<string, string>();
for (const record of routeData.aliases) {
  const targets = getPathVariants(record.to);
  const target = targets[0] ?? normalizePath(record.to);
  for (const variant of getPathVariants(record.from)) {
    aliases.set(variant, target);
  }
}

function resolveAlias(pathValue: string) {
  const normalized = normalizePath(pathValue);
  return aliases.get(normalized) ?? normalized;
}

export async function getContentDocument(pathValue: string) {
  for (const variant of getPathVariants(pathValue)) {
    const found = documentByPath.get(variant);
    if (found) {
      return found;
    }
  }

  return null;
}

export async function getPageContent(pathValue: string) {
  const document = await getContentDocument(pathValue);
  if (!document || document.type !== "page") {
    return null;
  }

  return document;
}

export async function getTemplateContentByPath(pathValue: string) {
  const resolvedPath = resolveAlias(pathValue);

  for (const variant of [...getPathVariants(pathValue), ...getPathVariants(resolvedPath)]) {
    const found = templateByPath.get(variant);
    if (found) {
      return found;
    }
  }

  return null;
}

export async function getArticleBySlug(type: NativeDocumentType, slug: string) {
  const prefixes: Record<NativeDocumentType, string> = {
    post: "/post/",
    news: "/news/",
    event: "/events-1/",
    profile: "/profile/",
    category: "/kosher-posts/categories/",
    tag: "/kosher-posts/tags/",
    page: "/",
  };

  const prefix = prefixes[type];
  const record = await getTemplateContentByPath(prefix + slug);
  if (!record || record.document.type !== type) {
    return null;
  }

  return record;
}

export async function listArticles(type: NativeDocumentType) {
  return templateRecords.filter(
    (record) => record.document.type === type && !isRetiredKosherBrowsePath(record.document.path),
  );
}

function matchesSection(pathValue: string, section: NativeSectionSitemap) {
  switch (section) {
    case "blog-categories-sitemap":
      return false;
    case "blog-posts-sitemap":
      return pathValue.startsWith("/post/");
    case "event-pages-sitemap":
      return pathValue.startsWith("/events-1/");
    case "dynamic-news-sitemap":
      return pathValue.startsWith("/news/");
    case "pages-sitemap":
      return (
        !pathValue.startsWith("/post/") &&
        !pathValue.startsWith("/events-1/") &&
        !pathValue.startsWith("/news/") &&
        !pathValue.startsWith("/kosher-posts/categories/")
      );
    default:
      return false;
  }
}

export async function listRoutesBySection(section: NativeSectionSitemap) {
  return routeData.canonical
    .map((record) => record.path)
    .filter((pathValue) => !isRetiredKosherBrowsePath(pathValue) && matchesSection(pathValue, section))
    .sort((a, b) => a.localeCompare(b));
}

export async function buildSearchDocuments() {
  return searchRecords.filter((record) => !isRetiredKosherBrowsePath(record.path));
}

export async function loadContentIndex() {
  return index;
}

export async function loadRouteData() {
  return routeData;
}

export async function resolveContentPath(pathValue: string) {
  const requestPath = normalizePath(pathValue);
  const resolvedPath = resolveAlias(requestPath);
  const document = (await getContentDocument(requestPath)) ?? (await getContentDocument(resolvedPath));
  const template = (await getTemplateContentByPath(requestPath)) ?? (await getTemplateContentByPath(resolvedPath));
  const overrideStatus = overrides.get(requestPath) ?? overrides.get(resolvedPath);
  const isKnownRoute = twoHundred.has(requestPath) || twoHundred.has(resolvedPath);

  return {
    requestPath,
    resolvedPath,
    overrideStatus,
    isKnownRoute,
    document,
    template,
  };
}

export async function resolveRequestPath(inputPath: string) {
  const normalized = normalizePath(inputPath);
  const resolved = resolveAlias(normalized);

  return {
    input: normalized,
    resolved,
    redirected: resolved !== normalized,
  };
}

export async function getContentAliases() {
  return routeData.aliases as NativeAliasRecord[];
}
