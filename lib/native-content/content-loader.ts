import fs from "node:fs/promises";
import path from "node:path";

export const MIRROR_DATA_DIR = path.join(process.cwd(), "mirror-data");

const CONTENT_DIR = path.join(MIRROR_DATA_DIR, "content");
const ROUTES_DIR = path.join(MIRROR_DATA_DIR, "routes");
const SEARCH_DIR = path.join(MIRROR_DATA_DIR, "search");

export type NativeDocumentType =
  | "page"
  | "post"
  | "news"
  | "event"
  | "category"
  | "tag"
  | "profile";

export type NativeContentIndexRecord = {
  path: string;
  type: NativeDocumentType;
  file: string;
};

export type NativeRouteContractRecord = {
  path: string;
  sourceUrl: string;
};

export type NativeStatusOverrideRecord = {
  path: string;
  status: number;
  sourceUrl: string;
};

export type NativeAliasRecord = {
  from: string;
  to: string;
  reason: string;
};

export type NativePageDocument = {
  id: string;
  type: NativeDocumentType;
  path: string;
  url: string;
  slug: string;
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  headings: string[];
  text: string;
  textHash: string;
  links: string[];
  assets: string[];
  bodyHtml: string;
  styleBundleId: string;
  renderHtml?: string;
  capturedAt: string;
};

export type NativeSearchIndexRecord = {
  path: string;
  type: NativeDocumentType;
  title: string;
  description: string;
  excerpt: string;
  terms: string[];
};

export type NativeRouteSets = {
  twoHundred: Set<string>;
  overrides: Map<string, number>;
  aliases: Map<string, string>;
};

export function normalizePath(rawPath: string) {
  if (!rawPath || rawPath === "") {
    return "/";
  }

  const input = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const [pathname, query = ""] = input.split("?");
  const cleanPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "") || "/";

  if (!query) {
    return cleanPath;
  }

  return `${cleanPath}?${query}`;
}

export function getPathVariants(pathValue: string) {
  const normalized = normalizePath(pathValue);
  const [pathname, query = ""] = normalized.split("?");
  const variants = new Set<string>([normalized]);

  const add = (candidatePathname: string) => {
    const clean = normalizePath(query ? `${candidatePathname}?${query}` : candidatePathname);
    variants.add(clean);
  };

  try {
    add(decodeURI(pathname));
  } catch {
    // ignore malformed URI variants
  }

  try {
    add(encodeURI(pathname));
  } catch {
    // ignore malformed URI variants
  }

  return [...variants];
}

let contentIndexCache: NativeContentIndexRecord[] | null = null;
let contentIndexByPathCache: Map<string, NativeContentIndexRecord> | null = null;
let routeSetsCache: NativeRouteSets | null = null;
let searchIndexCache: NativeSearchIndexRecord[] | null = null;

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

export async function loadNativeContentIndex(): Promise<NativeContentIndexRecord[]> {
  if (contentIndexCache) {
    return contentIndexCache;
  }

  const index = await readJsonFile<NativeContentIndexRecord[]>(
    path.join(CONTENT_DIR, "index.json"),
    [],
  );

  contentIndexCache = index;
  contentIndexByPathCache = new Map();

  for (const entry of index) {
    for (const variant of getPathVariants(entry.path)) {
      if (!contentIndexByPathCache.has(variant)) {
        contentIndexByPathCache.set(variant, entry);
      }
    }
  }

  return contentIndexCache;
}

export async function getNativeDocumentByPath(
  pathValue: string,
): Promise<NativePageDocument | null> {
  await loadNativeContentIndex();

  let item: NativeContentIndexRecord | undefined;
  for (const variant of getPathVariants(pathValue)) {
    item = contentIndexByPathCache?.get(variant);
    if (item) {
      break;
    }
  }

  if (!item) {
    return null;
  }

  const fullPath = path.join(CONTENT_DIR, item.file);
  return readJsonFile<NativePageDocument | null>(fullPath, null);
}

export async function getNativeSearchIndex(): Promise<NativeSearchIndexRecord[]> {
  if (searchIndexCache) {
    return searchIndexCache;
  }

  searchIndexCache = await readJsonFile<NativeSearchIndexRecord[]>(
    path.join(SEARCH_DIR, "index.json"),
    [],
  );

  return searchIndexCache;
}

async function loadNativeRouteData() {
  const [canonical, reachable, statusOverrides, aliases] = await Promise.all([
    readJsonFile<NativeRouteContractRecord[]>(
      path.join(ROUTES_DIR, "canonical-200.json"),
      [],
    ),
    readJsonFile<NativeRouteContractRecord[]>(
      path.join(ROUTES_DIR, "reachable-extra-200.json"),
      [],
    ),
    readJsonFile<NativeStatusOverrideRecord[]>(
      path.join(ROUTES_DIR, "status-overrides.json"),
      [],
    ),
    readJsonFile<NativeAliasRecord[]>(
      path.join(ROUTES_DIR, "aliases.json"),
      [],
    ),
  ]);

  const twoHundred = new Set<string>();
  const overrides = new Map<string, number>();
  const aliasMap = new Map<string, string>();

  for (const record of [...canonical, ...reachable]) {
    for (const variant of getPathVariants(record.path)) {
      twoHundred.add(variant);
    }
  }

  for (const record of statusOverrides) {
    for (const variant of getPathVariants(record.path)) {
      overrides.set(variant, record.status);
    }
  }

  for (const record of aliases) {
    const targets = getPathVariants(record.to);
    const target = targets[0] ?? normalizePath(record.to);

    for (const fromVariant of getPathVariants(record.from)) {
      aliasMap.set(fromVariant, target);
    }
  }

  return {
    twoHundred,
    overrides,
    aliases: aliasMap,
  };
}

export async function getNativeRouteSets(): Promise<NativeRouteSets> {
  if (routeSetsCache) {
    return routeSetsCache;
  }

  routeSetsCache = await loadNativeRouteData();
  return routeSetsCache;
}

export async function resolveRequestPath(inputPath: string) {
  const { aliases } = await getNativeRouteSets();
  const normalized = normalizePath(inputPath);
  const alias = aliases.get(normalized);

  if (!alias) {
    return {
      input: normalized,
      resolved: normalized,
      redirected: false,
    };
  }

  return {
    input: normalized,
    resolved: alias,
    redirected: alias !== normalized,
  };
}

export async function resolveNativeTemplatePath(pathValue: string) {
  const requestPath = normalizePath(pathValue);
  const resolved = await resolveRequestPath(requestPath);
  const document =
    (await getNativeDocumentByPath(requestPath)) ?? (await getNativeDocumentByPath(resolved.resolved));
  const routeSets = await getNativeRouteSets();
  const overrideStatus = routeSets.overrides.get(requestPath) ?? routeSets.overrides.get(resolved.resolved);
  const isKnownRoute = routeSets.twoHundred.has(requestPath) || routeSets.twoHundred.has(resolved.resolved);

  return {
    requestPath,
    resolvedPath: resolved.resolved,
    overrideStatus,
    isKnownRoute,
    document,
  };
}
