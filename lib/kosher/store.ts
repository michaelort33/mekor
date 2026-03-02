import { asc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { kosherPlaces, pageFreshness } from "@/db/schema";
import {
  KOSHER_NEIGHBORHOOD_LABELS,
  KOSHER_NEIGHBORHOODS,
  type ExtractedKosherPlace,
  type KosherNeighborhood,
  loadExtractedKosherPlaces,
} from "@/lib/kosher/extract";
import { validateManagedKosherPlacesContract } from "@/lib/native/contracts";

type NeighborhoodFilter = KosherNeighborhood | "all";

const VALID_NEIGHBORHOOD_FILTERS = new Set<string>([...KOSHER_NEIGHBORHOODS, "all"]);
const KOSHER_NEIGHBORHOOD_SET = new Set<KosherNeighborhood>(KOSHER_NEIGHBORHOODS);
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export type KosherDirectoryFreshnessKey = "center-city";

const KOSHER_DIRECTORY_FRESHNESS_KEY_TO_NEIGHBORHOOD: Record<
  KosherDirectoryFreshnessKey,
  KosherNeighborhood
> = {
  "center-city": "center-city",
};

export type ManagedKosherPlace = {
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
  sourceCapturedAt: string | null;
};

export type KosherPlaceFilters = {
  search?: string;
  neighborhood?: string;
  tag?: string;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeSearchValue(value: string | null | undefined) {
  return normalizeWhitespace(value ?? "").toLowerCase();
}

function normalizeTagFilter(value: string | null | undefined) {
  const normalized = normalizeSearchValue(value);
  if (!normalized || normalized === "all") {
    return "all";
  }

  return normalized;
}

function normalizeNeighborhoodFilter(value: string | null | undefined): NeighborhoodFilter {
  const normalized = normalizeSearchValue(value) || "all";
  if (!VALID_NEIGHBORHOOD_FILTERS.has(normalized)) {
    return "all";
  }

  return normalized as NeighborhoodFilter;
}

function toKosherNeighborhood(value: string): KosherNeighborhood {
  if (KOSHER_NEIGHBORHOOD_SET.has(value as KosherNeighborhood)) {
    return value as KosherNeighborhood;
  }

  return "unknown";
}

function searchableTagValue(value: string) {
  return normalizeSearchValue(value);
}

function toManagedKosherPlace(row: {
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
  sourceCapturedAt: Date | null;
}): ManagedKosherPlace {
  return {
    slug: row.slug,
    path: row.path,
    title: row.title,
    neighborhood: row.neighborhood,
    neighborhoodLabel: row.neighborhoodLabel,
    tags: row.tags ?? [],
    categoryPaths: row.categoryPaths ?? [],
    tagPaths: row.tagPaths ?? [],
    address: row.address,
    phone: row.phone,
    website: row.website,
    supervision: row.supervision,
    summary: row.summary,
    locationHref: row.locationHref,
    sourceCapturedAt: row.sourceCapturedAt ? row.sourceCapturedAt.toISOString() : null,
  };
}

function matchesSearch(place: ManagedKosherPlace, search: string) {
  if (!search) {
    return true;
  }

  const haystack = [
    place.title,
    place.address,
    place.summary,
    place.supervision,
    place.neighborhoodLabel,
    ...place.tags,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(search);
}

export function filterKosherPlaces(places: ManagedKosherPlace[], filters: KosherPlaceFilters = {}) {
  const search = normalizeSearchValue(filters.search);
  const neighborhood = normalizeNeighborhoodFilter(filters.neighborhood);
  const tag = normalizeTagFilter(filters.tag);

  return places.filter((place) => {
    if (neighborhood !== "all" && place.neighborhood !== neighborhood) {
      return false;
    }

    if (tag !== "all" && !place.tags.some((placeTag) => searchableTagValue(placeTag) === tag)) {
      return false;
    }

    return matchesSearch(place, search);
  });
}

async function syncExtractedKosherPlacesToDb(rows: ExtractedKosherPlace[]) {
  const db = getDb();

  for (const row of rows) {
    await db
      .insert(kosherPlaces)
      .values({
        slug: row.slug,
        path: row.path,
        title: row.title,
        neighborhood: row.neighborhood,
        neighborhoodLabel: row.neighborhoodLabel,
        tags: row.tags,
        categoryPaths: row.categoryPaths,
        tagPaths: row.tagPaths,
        address: row.address,
        phone: row.phone,
        website: row.website,
        supervision: row.supervision,
        summary: row.summary,
        locationHref: row.locationHref,
        sourceCapturedAt: row.capturedAt ? new Date(row.capturedAt) : null,
        sourceType: "mirror",
        sourceJson: row.sourceJson,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: kosherPlaces.path,
        set: {
          slug: row.slug,
          title: row.title,
          neighborhood: row.neighborhood,
          neighborhoodLabel: row.neighborhoodLabel,
          tags: row.tags,
          categoryPaths: row.categoryPaths,
          tagPaths: row.tagPaths,
          address: row.address,
          phone: row.phone,
          website: row.website,
          supervision: row.supervision,
          summary: row.summary,
          locationHref: row.locationHref,
          sourceCapturedAt: row.capturedAt ? new Date(row.capturedAt) : null,
          sourceType: "mirror",
          sourceJson: row.sourceJson,
          updatedAt: new Date(),
        },
      });
  }
}

function newestExtractedCapturedAt(
  rows: ExtractedKosherPlace[],
  neighborhood: KosherNeighborhood | "all",
) {
  let newest: Date | null = null;

  for (const row of rows) {
    if (neighborhood !== "all" && row.neighborhood !== neighborhood) {
      continue;
    }

    if (!row.capturedAt) {
      continue;
    }

    const capturedAt = new Date(row.capturedAt);
    if (Number.isNaN(capturedAt.getTime())) {
      continue;
    }

    if (!newest || capturedAt.getTime() > newest.getTime()) {
      newest = capturedAt;
    }
  }

  return newest;
}

async function readDirectoryFreshnessDate(key: KosherDirectoryFreshnessKey) {
  const rows = await getDb()
    .select({
      lastUpdatedAt: pageFreshness.lastUpdatedAt,
    })
    .from(pageFreshness)
    .where(eq(pageFreshness.key, key))
    .limit(1);

  return rows[0]?.lastUpdatedAt ?? null;
}

async function ensureDirectoryFreshnessRow(key: KosherDirectoryFreshnessKey) {
  const existingDate = await readDirectoryFreshnessDate(key);
  if (existingDate) {
    return existingDate;
  }

  const now = new Date();
  await getDb()
    .insert(pageFreshness)
    .values({
      key,
      lastUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();

  return (await readDirectoryFreshnessDate(key)) ?? now;
}

export async function getKosherDirectoryLastUpdated(key: KosherDirectoryFreshnessKey) {
  if (!process.env.DATABASE_URL) {
    const extracted = await loadExtractedKosherPlaces();
    const neighborhood = KOSHER_DIRECTORY_FRESHNESS_KEY_TO_NEIGHBORHOOD[key];
    const fallbackDate = newestExtractedCapturedAt(extracted, neighborhood);
    return fallbackDate ? fallbackDate.toISOString() : null;
  }

  const freshnessDate = await ensureDirectoryFreshnessRow(key);
  return freshnessDate.toISOString();
}

export async function refreshKosherDirectoryLastUpdatedIfStale(
  key: KosherDirectoryFreshnessKey,
  maxAgeDays: number,
) {
  const now = new Date();

  if (!process.env.DATABASE_URL) {
    return {
      key,
      updated: false,
      lastUpdatedAt: now.toISOString(),
      message: "DATABASE_URL is not configured",
    };
  }

  const lastUpdatedAt = await ensureDirectoryFreshnessRow(key);
  const threshold = now.getTime() - maxAgeDays * ONE_DAY_MS;

  if (lastUpdatedAt.getTime() >= threshold) {
    return {
      key,
      updated: false,
      lastUpdatedAt: lastUpdatedAt.toISOString(),
      message: "No refresh needed",
    };
  }

  await getDb()
    .insert(pageFreshness)
    .values({
      key,
      lastUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: pageFreshness.key,
      set: {
        lastUpdatedAt: now,
        updatedAt: now,
      },
    });

  return {
    key,
    updated: true,
    lastUpdatedAt: now.toISOString(),
    message: "Refreshed stale last updated timestamp",
  };
}

export async function getManagedKosherPlaces(filters: KosherPlaceFilters = {}) {
  const extracted = await loadExtractedKosherPlaces();
  const extractedManaged = extracted.map((row) =>
    toManagedKosherPlace({
      ...row,
      sourceCapturedAt: row.capturedAt ? new Date(row.capturedAt) : null,
    }),
  );

  if (!process.env.DATABASE_URL) {
    const filtered = filterKosherPlaces(extractedManaged, filters);
    return validateManagedKosherPlacesContract(
      filtered,
      "getManagedKosherPlaces: extracted mirror fallback",
    );
  }

  let managed: ManagedKosherPlace[];
  try {
    await syncExtractedKosherPlacesToDb(extracted);

    const rows = await getDb()
      .select({
        slug: kosherPlaces.slug,
        path: kosherPlaces.path,
        title: kosherPlaces.title,
        neighborhood: kosherPlaces.neighborhood,
        neighborhoodLabel: kosherPlaces.neighborhoodLabel,
        tags: kosherPlaces.tags,
        categoryPaths: kosherPlaces.categoryPaths,
        tagPaths: kosherPlaces.tagPaths,
        address: kosherPlaces.address,
        phone: kosherPlaces.phone,
        website: kosherPlaces.website,
        supervision: kosherPlaces.supervision,
        summary: kosherPlaces.summary,
        locationHref: kosherPlaces.locationHref,
        sourceCapturedAt: kosherPlaces.sourceCapturedAt,
      })
      .from(kosherPlaces)
      .orderBy(asc(kosherPlaces.neighborhood), asc(kosherPlaces.title));

    managed = rows.map((row) =>
      toManagedKosherPlace({
        ...row,
        neighborhood: toKosherNeighborhood(row.neighborhood),
        neighborhoodLabel:
          row.neighborhoodLabel || KOSHER_NEIGHBORHOOD_LABELS[toKosherNeighborhood(row.neighborhood)],
      }),
    );
  } catch {
    managed = extractedManaged;
  }

  const filtered = filterKosherPlaces(managed, filters);
  return validateManagedKosherPlacesContract(filtered, "getManagedKosherPlaces: final output");
}
