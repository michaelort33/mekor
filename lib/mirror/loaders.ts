import fs from "node:fs/promises";
import path from "node:path";

import type {
  AliasRecord,
  AssetBlobRecord,
  ContentIndexRecord,
  PageDocument,
  RouteContractRecord,
  StyleBundleRecord,
  StatusOverrideRecord,
} from "@/lib/mirror/types";
import { ASSETS_DIR, CONTENT_DIR, ROUTES_DIR, SEARCH_DIR } from "@/lib/mirror/paths";
import { normalizePath } from "@/lib/mirror/url";

let routeCache: {
  canonical: RouteContractRecord[];
  reachable: RouteContractRecord[];
  statusOverrides: StatusOverrideRecord[];
  aliases: AliasRecord[];
} | null = null;

let contentIndexCache: ContentIndexRecord[] | null = null;
let contentIndexByPathCache: Map<string, ContentIndexRecord> | null = null;
type SearchIndexItem = {
  path: string;
  type: string;
  title: string;
  description: string;
  excerpt: string;
  terms: string[];
};

let searchIndexCache: SearchIndexItem[] | null = null;
let styleBundleByIdCache: Map<string, StyleBundleRecord> | null = null;
let blobMapCache: AssetBlobRecord[] | null = null;
let blobMapByMirrorPathCache: Map<string, AssetBlobRecord> | null = null;

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

export async function loadRouteData() {
  if (routeCache) {
    return routeCache;
  }

  const [canonical, reachable, statusOverrides, aliases] = await Promise.all([
    readJsonFile<RouteContractRecord[]>(path.join(ROUTES_DIR, "canonical-200.json"), []),
    readJsonFile<RouteContractRecord[]>(path.join(ROUTES_DIR, "reachable-extra-200.json"), []),
    readJsonFile<StatusOverrideRecord[]>(path.join(ROUTES_DIR, "status-overrides.json"), []),
    readJsonFile<AliasRecord[]>(path.join(ROUTES_DIR, "aliases.json"), []),
  ]);

  routeCache = {
    canonical,
    reachable,
    statusOverrides,
    aliases,
  };

  return routeCache;
}

export async function loadRouteSets() {
  const routes = await loadRouteData();
  const twoHundred = new Set<string>();
  const overrides = new Map<string, number>();
  const aliases = new Map<string, string>();

  for (const record of [...routes.canonical, ...routes.reachable]) {
    twoHundred.add(normalizePath(record.path));
  }

  for (const record of routes.statusOverrides) {
    overrides.set(normalizePath(record.path), record.status);
  }

  for (const record of routes.aliases) {
    aliases.set(normalizePath(record.from), normalizePath(record.to));
  }

  return {
    twoHundred,
    overrides,
    aliases,
  };
}

export async function resolveRequestPath(inputPath: string) {
  const { aliases } = await loadRouteSets();
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

export async function loadContentIndex() {
  if (contentIndexCache) {
    return contentIndexCache;
  }

  contentIndexCache = await readJsonFile<ContentIndexRecord[]>(
    path.join(CONTENT_DIR, "index.json"),
    [],
  );
  contentIndexByPathCache = new Map(
    contentIndexCache.map((entry) => [normalizePath(entry.path), entry]),
  );

  return contentIndexCache;
}

export async function getDocumentByPath(pathValue: string) {
  await loadContentIndex();
  const target = normalizePath(pathValue);
  const item = contentIndexByPathCache?.get(target);

  if (!item) {
    return null;
  }

  const fullPath = path.join(CONTENT_DIR, item.file);
  return readJsonFile<PageDocument | null>(fullPath, null);
}

export async function listDocumentsByType(type: string) {
  const index = await loadContentIndex();
  const items = index.filter((entry) => entry.type === type);

  return Promise.all(
    items.map(async (item) => {
      const fullPath = path.join(CONTENT_DIR, item.file);
      return readJsonFile<PageDocument | null>(fullPath, null);
    }),
  ).then((records) => records.filter((record): record is PageDocument => Boolean(record)));
}

export async function loadSearchIndex() {
  if (searchIndexCache) {
    return searchIndexCache;
  }

  searchIndexCache = await readJsonFile<SearchIndexItem[]>(
    path.join(SEARCH_DIR, "index.json"),
    [],
  );

  return searchIndexCache;
}

export async function loadStyleBundles() {
  if (styleBundleByIdCache) {
    return styleBundleByIdCache;
  }

  const records = await readJsonFile<StyleBundleRecord[]>(
    path.join(CONTENT_DIR, "style-bundles.json"),
    [],
  );

  styleBundleByIdCache = new Map(records.map((record) => [record.id, record]));
  return styleBundleByIdCache;
}

export async function getStyleBundleById(styleBundleId: string | null | undefined) {
  if (!styleBundleId) {
    return null;
  }

  const styleBundleMap = await loadStyleBundles();
  return styleBundleMap.get(styleBundleId) ?? null;
}

export async function loadBlobMap() {
  if (blobMapCache) {
    return blobMapCache;
  }

  blobMapCache = await readJsonFile<AssetBlobRecord[]>(path.join(ASSETS_DIR, "blob-map.json"), []);
  return blobMapCache;
}

export async function loadBlobMapByMirrorPath() {
  if (blobMapByMirrorPathCache) {
    return blobMapByMirrorPathCache;
  }

  const rows = await loadBlobMap();
  const byMirrorPath = new Map<string, AssetBlobRecord>();

  const indexPath = (candidate: string, row: AssetBlobRecord) => {
    if (!candidate) {
      return;
    }

    const normalizedWithQuery = normalizePath(candidate);
    if (normalizedWithQuery.startsWith("/_files/ugd/") && !byMirrorPath.has(normalizedWithQuery)) {
      byMirrorPath.set(normalizedWithQuery, row);
    }

    const pathname = normalizedWithQuery.split("?")[0] ?? normalizedWithQuery;
    if (pathname.startsWith("/_files/ugd/") && !byMirrorPath.has(pathname)) {
      byMirrorPath.set(pathname, row);
    }
  };

  for (const row of rows) {
    if (row.path) {
      indexPath(row.path, row);
    }

    if (!row.sourceUrl) {
      continue;
    }

    try {
      const parsed = new URL(row.sourceUrl);
      indexPath(`${parsed.pathname}${parsed.search}`, row);
      indexPath(parsed.pathname, row);
    } catch {
      // keep best-effort indexing for malformed source URLs
    }
  }

  blobMapByMirrorPathCache = byMirrorPath;
  return blobMapByMirrorPathCache;
}
