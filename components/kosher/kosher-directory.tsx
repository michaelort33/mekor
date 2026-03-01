"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { KosherNeighborhood } from "@/lib/kosher/extract";
import type { ManagedKosherPlace } from "@/lib/kosher/store";

type KosherDirectoryProps = {
  places: ManagedKosherPlace[];
  defaultNeighborhood?: KosherNeighborhood | "all";
};

const NEIGHBORHOOD_OPTIONS: Array<{ value: KosherNeighborhood | "all"; label: string }> = [
  { value: "all", label: "All Neighborhoods" },
  { value: "center-city", label: "Center City & Vicinity" },
  { value: "main-line-manyunk", label: "Main Line / Manyunk" },
  { value: "old-yorkroad-northeast", label: "Old York Road / Northeast" },
  { value: "cherry-hill", label: "Cherry Hill" },
];

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

export function KosherDirectory({ places, defaultNeighborhood = "all" }: KosherDirectoryProps) {
  const [search, setSearch] = useState("");
  const [selectedNeighborhood, setSelectedNeighborhood] =
    useState<KosherNeighborhood | "all">(defaultNeighborhood);
  const [selectedTag, setSelectedTag] = useState("all");
  const selectedTagValue = normalize(selectedTag);

  const tagOptions = useMemo(() => {
    const tags = new Set<string>();
    for (const place of places) {
      for (const tag of place.tags) {
        tags.add(tag);
      }
    }

    return ["all", ...[...tags].sort((a, b) => a.localeCompare(b))];
  }, [places]);

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

  function selectCategoryTag(tag: string) {
    setSelectedTag((current) => (normalize(current) === normalize(tag) ? "all" : tag));
  }

  return (
    <section className="kosher-directory" aria-label="Kosher places directory">
      <div className="kosher-directory__controls">
        <label className="kosher-directory__control">
          <span>Search</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, address, tag, supervision"
          />
        </label>

        <label className="kosher-directory__control">
          <span>Neighborhood</span>
          <select
            value={selectedNeighborhood}
            onChange={(event) => setSelectedNeighborhood(event.target.value as KosherNeighborhood | "all")}
          >
            {NEIGHBORHOOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="kosher-directory__control">
          <span>Category</span>
          <select value={selectedTag} onChange={(event) => setSelectedTag(event.target.value)}>
            {tagOptions.map((tag) => (
              <option key={tag} value={tag}>
                {tag === "all" ? "All Categories" : tag}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="kosher-directory__tabs" role="tablist" aria-label="Category quick filters">
        <button
          type="button"
          role="tab"
          className={`kosher-directory__tab${selectedTagValue === "all" ? " is-active" : ""}`}
          aria-selected={selectedTagValue === "all"}
          onClick={() => setSelectedTag("all")}
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
              onClick={() => setSelectedTag(tag)}
            >
              {tag}
            </button>
          );
        })}
      </div>

      <p className="kosher-directory__count">
        Showing {filteredPlaces.length} of {places.length} kosher places.
      </p>

      {filteredPlaces.length === 0 ? (
        <p className="kosher-directory__empty">
          No places match these filters. Try a broader neighborhood, category, or search term.
        </p>
      ) : (
        <div className="kosher-directory__grid">
          {filteredPlaces.map((place) => (
            <article key={place.path} className="kosher-directory__card">
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
          ))}
        </div>
      )}
    </section>
  );
}
