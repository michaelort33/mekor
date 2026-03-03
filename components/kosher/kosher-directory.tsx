"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  KOSHER_SET_FILTER_EVENT,
  type KosherSetFilterDetail,
} from "@/components/kosher/kosher-filter-events";
import type { KosherNeighborhood } from "@/lib/kosher/extract";
import type { ManagedKosherPlace } from "@/lib/kosher/store";

type KosherDirectoryProps = {
  places: ManagedKosherPlace[];
  defaultNeighborhood?: KosherNeighborhood | "all";
};

const KOSHER_FALLBACK_IMAGE_SRC = "/images/kosher/fallback-food.svg";
const INITIAL_GROUP_CARD_COUNT = 3;
const INITIAL_FILTERED_CARD_COUNT = 10;

const NEIGHBORHOOD_OPTIONS: Array<{ value: KosherNeighborhood | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "center-city", label: "Center City" },
  { value: "main-line-manyunk", label: "Main Line" },
  { value: "old-yorkroad-northeast", label: "Old York Rd / NE" },
  { value: "cherry-hill", label: "Cherry Hill" },
];

const NEIGHBORHOOD_FULL_LABELS: Record<string, string> = {
  all: "All Neighborhoods",
  "center-city": "Center City & Vicinity",
  "main-line-manyunk": "Main Line / Manyunk",
  "old-yorkroad-northeast": "Old York Road / Northeast",
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

function normalizeWebsiteLabel(website: string) {
  if (!website) {
    return "";
  }

  try {
    const parsed = new URL(website);
    return parsed.hostname.replace(/^www\./i, "");
  } catch {
    return website;
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

  const matchedNeighborhood = NEIGHBORHOOD_OPTIONS.find(
    (option) => normalize(option.value) === normalized,
  );
  return matchedNeighborhood?.value ?? fallbackNeighborhood;
}

function resolveTagFromUrl(requestedTag: string, tagOptions: string[]) {
  const normalized = normalize(requestedTag);
  if (!normalized || normalized === "all") {
    return "all";
  }

  const matchedTag = tagOptions.find((tag) => normalize(tag) === normalized);
  return matchedTag ?? "all";
}

export function KosherDirectory({ places, defaultNeighborhood = "all" }: KosherDirectoryProps) {
  const searchParams = useSearchParams();
  const urlTag = searchParams.get("tag") ?? "";
  const urlNeighborhood = searchParams.get("neighborhood") ?? "";
  const [search, setSearch] = useState("");

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
  const [selectedTag, setSelectedTag] = useState(() => resolveTagFromUrl(urlTag, tagOptions));
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [showAllFiltered, setShowAllFiltered] = useState(false);
  const selectedTagValue = normalize(selectedTag);

  const urlSelectedTag = useMemo(() => resolveTagFromUrl(urlTag, tagOptions), [urlTag, tagOptions]);
  const urlSelectedNeighborhood = useMemo(
    () => resolveNeighborhoodFromUrl(urlNeighborhood, defaultNeighborhood),
    [defaultNeighborhood, urlNeighborhood],
  );

  useEffect(() => {
    if (selectedTag === urlSelectedTag) {
      return;
    }

    setExpandedGroups({});
    setShowAllFiltered(false);
    setSelectedTag(urlSelectedTag);
  }, [selectedTag, urlSelectedTag]);

  useEffect(() => {
    if (selectedNeighborhood === urlSelectedNeighborhood) {
      return;
    }

    setExpandedGroups({});
    setShowAllFiltered(false);
    setSelectedNeighborhood(urlSelectedNeighborhood);
  }, [selectedNeighborhood, urlSelectedNeighborhood]);

  useEffect(() => {
    const onExternalFilter = (event: Event) => {
      const detail = (event as CustomEvent<KosherSetFilterDetail>).detail ?? {};
      const requestedTag = typeof detail.tag === "string" ? detail.tag : "";
      const requestedNeighborhood = typeof detail.neighborhood === "string" ? detail.neighborhood : "";
      const nextTag = resolveTagFromUrl(requestedTag, tagOptions);
      const nextNeighborhood = resolveNeighborhoodFromUrl(requestedNeighborhood, defaultNeighborhood);

      setExpandedGroups({});
      setShowAllFiltered(false);
      setSelectedTag(nextTag);
      if (requestedNeighborhood) {
        setSelectedNeighborhood(nextNeighborhood);
      }
    };

    window.addEventListener(KOSHER_SET_FILTER_EVENT, onExternalFilter);
    return () => {
      window.removeEventListener(KOSHER_SET_FILTER_EVENT, onExternalFilter);
    };
  }, [defaultNeighborhood, tagOptions]);

  const filteredPlaces = useMemo(() => {
    const searchValue = normalize(search);
    const tagValue = selectedTagValue;

    return places.filter((place) => {
      if (selectedNeighborhood !== "all" && place.neighborhood !== selectedNeighborhood) {
        return false;
      }

      if (tagValue !== "all" && !place.tags.some((tag) => normalize(tag) === tagValue)) {
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
  }, [places, search, selectedNeighborhood, selectedTagValue]);

  const quickTagOptions = useMemo(() => tagOptions.filter((tag) => tag !== "all"), [tagOptions]);
  const groupedPlaces = useMemo(() => {
    const byNeighborhood = new Map<KosherNeighborhood, ManagedKosherPlace[]>();
    for (const place of filteredPlaces) {
      const existing = byNeighborhood.get(place.neighborhood);
      if (existing) {
        existing.push(place);
      } else {
        byNeighborhood.set(place.neighborhood, [place]);
      }
    }

    return NEIGHBORHOOD_OPTIONS
      .filter((option) => option.value !== "all")
      .map((option) => ({
        neighborhood: option.value as KosherNeighborhood,
        label: NEIGHBORHOOD_FULL_LABELS[option.value] ?? option.label,
        places: byNeighborhood.get(option.value as KosherNeighborhood) ?? [],
      }))
      .filter((group) => group.places.length > 0);
  }, [filteredPlaces]);

  function selectNeighborhood(value: KosherNeighborhood | "all") {
    setExpandedGroups({});
    setShowAllFiltered(false);
    setSelectedNeighborhood(value);
  }

  function selectCategoryTag(tag: string) {
    setExpandedGroups({});
    setShowAllFiltered(false);
    setSelectedTag((current) => (normalize(current) === normalize(tag) ? "all" : tag));
  }

  const visibleFilteredPlaces = showAllFiltered
    ? filteredPlaces
    : filteredPlaces.slice(0, INITIAL_FILTERED_CARD_COUNT);

  function renderPlaceCard(place: ManagedKosherPlace) {
    return (
      <article key={place.path} className="kosher-directory__card">
        <Link href={place.path} className="kosher-directory__card-image-link" aria-label={`Open ${place.title}`}>
          <div className="kosher-directory__card-image">
            <img
              src={place.heroImage || KOSHER_FALLBACK_IMAGE_SRC}
              alt={place.title}
              loading="lazy"
              onError={(event) => {
                const image = event.currentTarget;
                if (!image.src.endsWith(KOSHER_FALLBACK_IMAGE_SRC)) {
                  image.src = KOSHER_FALLBACK_IMAGE_SRC;
                }
              }}
            />
          </div>
        </Link>

        <div className="kosher-directory__meta">
          <span>{place.neighborhoodLabel}</span>
          {place.tags.map((tag) => (
            <button
              key={`${place.path}-${tag}`}
              type="button"
              className={`kosher-directory__tag${
                selectedTagValue !== "all" && normalize(tag) === selectedTagValue ? " is-active" : ""
              }`}
              onClick={() => selectCategoryTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        <h3>{place.title}</h3>
        {place.phone ? <p className="kosher-directory__phone">{formatPhone(place.phone)}</p> : null}
        {place.summary ? <p className="kosher-directory__summary">{place.summary}</p> : null}
        {place.address ? <p>{place.address}</p> : null}
        {place.supervision ? <p>{place.supervision}</p> : null}

        <div className="kosher-directory__links">
          <Link href={place.path}>Details</Link>
          {place.locationHref ? (
            <a href={place.locationHref} target="_blank" rel="noreferrer noopener">
              Map
            </a>
          ) : null}
          {place.website ? (
            <a href={place.website} target="_blank" rel="noreferrer noopener">
              {normalizeWebsiteLabel(place.website)}
            </a>
          ) : null}
          {place.phone ? <a href={`tel:${place.phone}`}>{formatPhone(place.phone)}</a> : null}
        </div>
      </article>
    );
  }

  return (
    <section id="kosher-directory" className="kosher-directory" aria-label="Kosher places directory">
      <div className="kosher-directory__search-row">
        <input
          type="search"
          value={search}
          onChange={(event) => {
            setExpandedGroups({});
            setShowAllFiltered(false);
            setSearch(event.target.value);
          }}
          placeholder="Search restaurants, bakeries, cafes..."
          className="kosher-directory__search"
        />
      </div>

      <div className="kosher-directory__filter-group">
        <span className="kosher-directory__filter-label">Neighborhood</span>
        <div className="kosher-directory__tabs" role="tablist" aria-label="Neighborhood filter">
          {NEIGHBORHOOD_OPTIONS.map((option) => {
            const isActive = selectedNeighborhood === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                className={`kosher-directory__tab${isActive ? " is-active" : ""}`}
                aria-selected={isActive}
                onClick={() => selectNeighborhood(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="kosher-directory__filter-group">
        <span className="kosher-directory__filter-label">Category</span>
        <div className="kosher-directory__tabs" role="tablist" aria-label="Category filter">
          <button
            type="button"
            role="tab"
            className={`kosher-directory__tab${selectedTagValue === "all" ? " is-active" : ""}`}
            aria-selected={selectedTagValue === "all"}
            onClick={() => {
              setExpandedGroups({});
              setShowAllFiltered(false);
              setSelectedTag("all");
            }}
          >
            All
          </button>
          {quickTagOptions.map((tag) => {
            const isActive = selectedTagValue !== "all" && normalize(tag) === selectedTagValue;
            return (
              <button
                key={tag}
                type="button"
                role="tab"
                className={`kosher-directory__tab${isActive ? " is-active" : ""}`}
                aria-selected={isActive}
                onClick={() => {
                  setExpandedGroups({});
                  setShowAllFiltered(false);
                  setSelectedTag(tag);
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <p className="kosher-directory__count">
        Showing {filteredPlaces.length} of {places.length} kosher places.
      </p>

      {filteredPlaces.length === 0 ? (
        <p className="kosher-directory__empty">
          No places match these filters. Try a broader neighborhood, category, or search term.
        </p>
      ) : (
        <>
          {selectedNeighborhood === "all" ? (
            <div className="kosher-directory__sections">
              {groupedPlaces.map((group) => {
                const expanded = expandedGroups[group.neighborhood] ?? false;
                const visibleGroupPlaces = expanded
                  ? group.places
                  : group.places.slice(0, INITIAL_GROUP_CARD_COUNT);
                const hiddenCount = group.places.length - visibleGroupPlaces.length;

                return (
                  <section
                    key={`group-${group.neighborhood}`}
                    className="kosher-directory__section"
                    aria-label={group.label}
                  >
                    <div className="kosher-directory__section-head">
                      <h3 className="kosher-directory__section-title">{group.label}</h3>
                      <span className="kosher-directory__section-count">{group.places.length}</span>
                    </div>
                    <div className="kosher-directory__grid">
                      {visibleGroupPlaces.map((place) => renderPlaceCard(place))}
                    </div>
                    {hiddenCount > 0 ? (
                      <button
                        type="button"
                        className="kosher-directory__more"
                        onClick={() =>
                          setExpandedGroups((current) => ({
                            ...current,
                            [group.neighborhood]: true,
                          }))
                        }
                      >
                        Show {hiddenCount} more in {group.label}
                      </button>
                    ) : null}
                  </section>
                );
              })}
            </div>
          ) : (
            <>
              <div className="kosher-directory__grid">
                {visibleFilteredPlaces.map((place) => renderPlaceCard(place))}
              </div>
              {!showAllFiltered && filteredPlaces.length > visibleFilteredPlaces.length ? (
                <button
                  type="button"
                  className="kosher-directory__more"
                  onClick={() => setShowAllFiltered(true)}
                >
                  Show {filteredPlaces.length - visibleFilteredPlaces.length} more places
                </button>
              ) : null}
            </>
          )}
        </>
      )}
    </section>
  );
}
