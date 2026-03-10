import { getNativeSearchIndex } from "@/lib/native-content/content-loader";
import { SITE_MENU, isNavGroup } from "@/lib/navigation/site-menu";

export type UniversalSearchDocument = {
  path: string;
  type: string;
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

function normalizeQuery(raw: string) {
  return raw.toLowerCase().replace(/[^a-z0-9/\-\s]/g, " ").replace(/\s+/g, " ").trim();
}

function cleanExcerpt(input: string) {
  return input
    .replace(/Skip to Main Content/gi, "")
    .replace(/Membership\s+Events\s+Donate\s+Kiddush\s+Center City Beit Midrash/gi, "")
    .replace(/Join Us\s+Davening\s+Who We Are\s+Kosher Restaurants\s+More\s+Support Mekor/gi, "")
    .replace(/\s+/g, " ")
    .trim();
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

async function buildUniversalDocuments() {
  const records = await getNativeSearchIndex();
  const menuKeywords = flattenMenuKeywords();

  return records.map((record) => {
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

    return {
      path: record.path,
      type: record.type,
      title: record.title || record.path,
      description: record.description || "",
      excerpt: cleanExcerpt(record.excerpt || record.description || ""),
      keywords: [...keywords],
    } satisfies UniversalSearchDocument;
  });
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
