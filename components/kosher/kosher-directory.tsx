"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import styles from "@/components/kosher/kosher-directory.module.css";
import { cn } from "@/lib/utils";
import type { KosherNeighborhood } from "@/lib/kosher/neighborhoods";
import type { ManagedKosherPlace } from "@/lib/kosher/store";

type KosherDirectoryProps = {
  places: ManagedKosherPlace[];
  defaultNeighborhood?: KosherNeighborhood | "all";
};

const KOSHER_FALLBACK_IMAGE_SRC =
  "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/fcd909c6286c1cb51d76acc1726731f3ca21d3d5-fallback-food.svg";

// Short labels match the old neighborhood tab strip.
const NEIGHBORHOOD_OPTIONS: Array<{ value: KosherNeighborhood | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "center-city", label: "Center City" },
  { value: "main-line-manyunk", label: "Main Line" },
  { value: "old-yorkroad-northeast", label: "Old York Road" },
  { value: "cherry-hill", label: "Cherry Hill" },
];

const NEIGHBORHOOD_FULL_LABELS: Record<string, string> = {
  all: "All Neighborhoods",
  "center-city": "Center City & Vicinity",
  "main-line-manyunk": "Main Line/Manyunk",
  "old-yorkroad-northeast": "Northeast Philly / Old York Road",
  "cherry-hill": "Cherry Hill",
  unknown: "Other",
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function formatPhone(phone: string) {
  if (!phone) {
    return "";
  }

  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return phone;
}

function phoneHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  const normalized = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return normalized.length === 10 ? `tel:+1${normalized}` : `tel:${digits}`;
}

function normalizeWebsiteLabel(website: string) {
  if (!website) {
    return "";
  }

  const ASSET_HOST_PATTERNS = [/\.blob\.vercel-storage\.com$/i, /\.amazonaws\.com$/i];
  const MAX_LABEL_LENGTH = 24;

  try {
    const host = new URL(website).hostname.replace(/^www\./i, "");
    if (ASSET_HOST_PATTERNS.some((pattern) => pattern.test(host))) {
      return "Website";
    }
    return host.length > MAX_LABEL_LENGTH ? `${host.slice(0, MAX_LABEL_LENGTH - 1)}…` : host;
  } catch {
    return website.length > MAX_LABEL_LENGTH ? `${website.slice(0, MAX_LABEL_LENGTH - 1)}…` : website;
  }
}

function resolveNeighborhoodFromUrl(
  requestedNeighborhood: string,
  fallbackNeighborhood: KosherNeighborhood | "all",
) {
  const normalized = normalize(requestedNeighborhood);
  if (!normalized) {
    return fallbackNeighborhood;
  }

  const matchedNeighborhood = NEIGHBORHOOD_OPTIONS.find((option) => normalize(option.value) === normalized);
  return matchedNeighborhood?.value ?? fallbackNeighborhood;
}

function resolveCategoryFromUrl(requestedCategory: string, tagOptions: string[]) {
  const normalized = normalize(requestedCategory);
  if (!normalized || normalized === "all") {
    return "all";
  }

  const matchedTag = tagOptions.find((tag) => normalize(tag) === normalized);
  return matchedTag ?? "all";
}

export function KosherDirectory({ places, defaultNeighborhood = "all" }: KosherDirectoryProps) {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("q") ?? "";
  const urlCategory = searchParams.get("category") ?? searchParams.get("tag") ?? "";
  const urlNeighborhood = searchParams.get("neighborhood") ?? "";
  const [search, setSearch] = useState(urlSearch);

  const tagOptions = useMemo(() => {
    const tags = new Set<string>();
    for (const place of places) {
      for (const tag of place.tags) {
        tags.add(tag);
      }
    }

    return ["all", ...[...tags].sort((a, b) => a.localeCompare(b))];
  }, [places]);

  const [selectedNeighborhood, setSelectedNeighborhood] = useState<KosherNeighborhood | "all">(() =>
    resolveNeighborhoodFromUrl(urlNeighborhood, defaultNeighborhood),
  );
  const [selectedCategory, setSelectedCategory] = useState(() => resolveCategoryFromUrl(urlCategory, tagOptions));
  const selectedCategoryValue = normalize(selectedCategory);
  const mountedRef = useRef(false);

  const updateUrl = useCallback((query: string, neighborhood: string, category: string) => {
    const url = new URL(window.location.href);

    if (!query.trim()) {
      url.searchParams.delete("q");
    } else {
      url.searchParams.set("q", query.trim());
    }

    if (!neighborhood || neighborhood === "all") {
      url.searchParams.delete("neighborhood");
    } else {
      url.searchParams.set("neighborhood", neighborhood);
    }

    if (!category || category === "all") {
      url.searchParams.delete("category");
    } else {
      url.searchParams.set("category", category);
    }

    url.searchParams.delete("tag");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}#directory`);
  }, []);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    updateUrl(search, selectedNeighborhood, selectedCategory);
  }, [search, selectedNeighborhood, selectedCategory, updateUrl]);

  const filteredPlaces = useMemo(() => {
    const searchValue = normalize(search);
    const categoryValue = selectedCategoryValue;

    return places.filter((place) => {
      if (selectedNeighborhood !== "all" && place.neighborhood !== selectedNeighborhood) {
        return false;
      }

      if (categoryValue !== "all" && !place.tags.some((tag) => normalize(tag) === categoryValue)) {
        return false;
      }

      if (!searchValue) {
        return true;
      }

      const searchableText = [
        place.title,
        place.summary,
        place.address,
        place.supervision,
        place.neighborhoodLabel,
        ...place.tags,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(searchValue);
    });
  }, [places, search, selectedNeighborhood, selectedCategoryValue]);

  function renderPlaceCard(place: ManagedKosherPlace) {
    const phone = formatPhone(place.phone);
    const tel = phoneHref(place.phone);

    return (
      <article key={place.path} className={styles.card}>
        <Link href={place.path} className={styles.imageLink} aria-label={`Open ${place.title}`}>
          <Image
            src={place.heroImage || KOSHER_FALLBACK_IMAGE_SRC}
            alt={place.title}
            width={960}
            height={720}
            sizes="(max-width: 900px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className={styles.image}
            onError={(event) => {
              const image = event.currentTarget;
              if (!image.src.endsWith(KOSHER_FALLBACK_IMAGE_SRC)) {
                image.src = KOSHER_FALLBACK_IMAGE_SRC;
              }
            }}
          />
        </Link>

        <div className={styles.body}>
          <div className={styles.tagRow}>
            <span className={styles.tag}>{place.neighborhoodLabel}</span>
            {place.tags.map((tag) => (
              <button
                key={`${place.path}-${tag}`}
                type="button"
                className={cn(styles.tag, selectedCategoryValue !== "all" && normalize(tag) === selectedCategoryValue && styles.tagActive)}
                onClick={() => setSelectedCategory((current) => (normalize(current) === normalize(tag) ? "all" : tag))}
              >
                {tag}
              </button>
            ))}
          </div>

          <h3 className={styles.cardTitle}>{place.title}</h3>
          {place.summary ? <p className={styles.summary}>{place.summary}</p> : null}

          <dl className={styles.facts}>
            {place.supervision ? (
              <>
                <dt>Supervision</dt>
                <dd className={styles.supervision}>{place.supervision}</dd>
              </>
            ) : null}
            {place.address ? (
              <>
                <dt>Address</dt>
                <dd>{place.address}</dd>
              </>
            ) : null}
            {phone ? (
              <>
                <dt>Phone</dt>
                <dd>
                  {tel ? (
                    <a className={styles.phoneLink} href={tel}>
                      {phone}
                    </a>
                  ) : (
                    phone
                  )}
                </dd>
              </>
            ) : null}
          </dl>

          <div className={styles.cardActions}>
            <Link href={place.path} className={styles.cardAction}>
              Details
            </Link>
            {place.locationHref ? (
              <a
                href={place.locationHref}
                target="_blank"
                rel="noreferrer noopener"
                className={styles.cardActionGhost}
              >
                Map
              </a>
            ) : null}
            {place.certificateHref ? (
              <a
                href={place.certificateHref}
                target="_blank"
                rel="noreferrer noopener"
                className={styles.cardActionGhost}
              >
                Certificate
              </a>
            ) : null}
            {place.website ? (
              <a href={place.website} target="_blank" rel="noreferrer noopener" className={styles.cardActionGhost}>
                {normalizeWebsiteLabel(place.website)}
              </a>
            ) : null}
          </div>
        </div>
      </article>
    );
  }

  return (
    <>
      <div id="kosher-directory" className="sr-only" />
      <section id="directory" className={styles.directory} aria-label="Kosher places directory">
        <div className={styles.filters}>
          <label className={styles.searchLabel}>
            <span>Search</span>
            <input
              className={styles.searchInput}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, address, supervision…"
              autoComplete="off"
            />
          </label>

          <div className={styles.filterGroup}>
            <span>Neighborhood</span>
            <div className={styles.chipRow} role="tablist" aria-label="Neighborhood filter">
              {NEIGHBORHOOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={selectedNeighborhood === option.value}
                  className={cn(styles.chip, selectedNeighborhood === option.value && styles.chipActive)}
                  onClick={() => setSelectedNeighborhood(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {tagOptions.length > 1 ? (
            <div className={styles.filterGroup}>
              <span>Category</span>
              <div className={styles.chipRow} role="tablist" aria-label="Category filter">
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedCategoryValue === "all"}
                  className={cn(styles.chip, selectedCategoryValue === "all" && styles.chipActive)}
                  onClick={() => setSelectedCategory("all")}
                >
                  All
                </button>
                {tagOptions
                  .filter((tag) => tag !== "all")
                  .map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      role="tab"
                      aria-selected={selectedCategoryValue !== "all" && normalize(tag) === selectedCategoryValue}
                      className={cn(
                        styles.chip,
                        selectedCategoryValue !== "all" && normalize(tag) === selectedCategoryValue && styles.chipActive,
                      )}
                      onClick={() =>
                        setSelectedCategory((current) => (normalize(current) === normalize(tag) ? "all" : tag))
                      }
                    >
                      {tag}
                    </button>
                  ))}
              </div>
            </div>
          ) : null}

          <div className={styles.statusRow}>
            <p className={styles.statusText}>
              Showing {filteredPlaces.length} of {places.length}
              {selectedNeighborhood !== "all" ? ` in ${NEIGHBORHOOD_FULL_LABELS[selectedNeighborhood]}` : ""}
            </p>
            <button
              type="button"
              className={styles.resetButton}
              onClick={() => {
                setSearch("");
                setSelectedNeighborhood(defaultNeighborhood);
                setSelectedCategory("all");
              }}
            >
              Clear filters
            </button>
          </div>
        </div>

        {filteredPlaces.length === 0 ? (
          <p className={styles.empty}>No kosher places match those filters right now. Try another neighborhood, category, or search term.</p>
        ) : (
          <div className={styles.grid}>{filteredPlaces.map(renderPlaceCard)}</div>
        )}
      </section>
    </>
  );
}
