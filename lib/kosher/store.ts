import { asc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { kosherPlaces, pageFreshness } from "@/db/schema";
import {
  KOSHER_NEIGHBORHOOD_LABELS,
  KOSHER_NEIGHBORHOODS,
  type KosherNeighborhood,
} from "@/lib/kosher/extract";
import { validateManagedKosherPlacesContract } from "@/lib/native/contracts";

type NeighborhoodFilter = KosherNeighborhood | "all";

const VALID_NEIGHBORHOOD_FILTERS = new Set<string>([...KOSHER_NEIGHBORHOODS, "all"]);
const KOSHER_NEIGHBORHOOD_SET = new Set<KosherNeighborhood>(KOSHER_NEIGHBORHOODS);
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export type KosherDirectoryFreshnessKey = "center-city";

export type ManagedKosherPlace = {
  slug: string;
  path: string;
  title: string;
  neighborhood: KosherNeighborhood;
  neighborhoodLabel: string;
  heroImage: string;
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
  return value.replace(/s+/g, " ").trim();
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

function readSourceHeroImage(sourceJson: Record<string, unknown> | null | undefined) {
  const value = sourceJson?.heroImage;
  if (typeof value !== "string") {
    return "";
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    return "";
  }

  return "";
}

function toManagedKosherPlace(row: {
  slug: string;
  path: string;
  title: string;
  neighborhood: KosherNeighborhood;
  neighborhoodLabel: string;
  sourceJson?: Record<string, unknown>;
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
    heroImage: readSourceHeroImage(row.sourceJson),
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
    return null;
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
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for kosher places");
  }

  const rows = await getDb()
    .select({
      slug: kosherPlaces.slug,
      path: kosherPlaces.path,
      title: kosherPlaces.title,
      neighborhood: kosherPlaces.neighborhood,
      neighborhoodLabel: kosherPlaces.neighborhoodLabel,
      sourceJson: kosherPlaces.sourceJson,
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

  const managed = rows.map((row) =>
    toManagedKosherPlace({
      ...row,
      neighborhood: toKosherNeighborhood(row.neighborhood),
      neighborhoodLabel:
        row.neighborhoodLabel || KOSHER_NEIGHBORHOOD_LABELS[toKosherNeighborhood(row.neighborhood)],
    }),
  );
  const filtered = filterKosherPlaces(managed, filters);
  return validateManagedKosherPlacesContract(filtered, "getManagedKosherPlaces: db output");
}
