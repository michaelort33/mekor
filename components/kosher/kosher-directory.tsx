"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { KosherNeighborhood } from "@/lib/kosher/neighborhoods";
import type { ManagedKosherPlace } from "@/lib/kosher/store";

type KosherDirectoryProps = {
  places: ManagedKosherPlace[];
  defaultNeighborhood?: KosherNeighborhood | "all";
};

const KOSHER_FALLBACK_IMAGE_SRC = "/images/kosher/fallback-food.svg";

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
    return (
      <article key={place.path}>
        <Card className="h-full overflow-hidden rounded-[14px] border-[#d8cfbe] bg-[#fdf8ef] shadow-[0_1px_0_rgba(255,255,255,0.75)_inset]">
          <Link href={place.path} className="block" aria-label={`Open ${place.title}`}>
            <div className="overflow-hidden">
              <Image
                src={place.heroImage || KOSHER_FALLBACK_IMAGE_SRC}
                alt={place.title}
                width={960}
                height={720}
                sizes="(max-width: 900px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="h-52 w-full object-cover transition duration-300 hover:scale-[1.02] sm:h-56"
                onError={(event) => {
                  const image = event.currentTarget;
                  if (!image.src.endsWith(KOSHER_FALLBACK_IMAGE_SRC)) {
                    image.src = KOSHER_FALLBACK_IMAGE_SRC;
                  }
                }}
              />
            </div>
          </Link>

          <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border-[#cbbca2] bg-[#efe3d2] text-[#4f5f72]">{place.neighborhoodLabel}</Badge>
              {place.tags.map((tag) => (
                <button
                  key={`${place.path}-${tag}`}
                  type="button"
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] transition",
                    selectedCategoryValue !== "all" && normalize(tag) === selectedCategoryValue
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
                      : "border-[#ccbea6] bg-[#f7ecdb] text-[#5b4933] hover:border-[#baa88d] hover:bg-[#f0dfc8] hover:text-[#473724]",
                  )}
                  style={
                    selectedCategoryValue !== "all" && normalize(tag) === selectedCategoryValue
                      ? { color: "#f8fbff" }
                      : undefined
                  }
                  onClick={() =>
                    setSelectedCategory((current) => (normalize(current) === normalize(tag) ? "all" : tag))
                  }
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <h3 className="font-[family-name:var(--font-heading)] text-[clamp(1.65rem,2.5vw,2.15rem)] leading-[1.04] tracking-[-0.02em] text-[#24374d]">
                {place.title}
              </h3>
              {place.summary ? <p className="text-sm leading-7 text-[#445365]">{place.summary}</p> : null}
              <div className="space-y-2 text-sm leading-6 text-[#526173]">
                {place.address ? <p>{place.address}</p> : null}
                {place.supervision ? <p>{place.supervision}</p> : null}
                {place.phone ? <p>{formatPhone(place.phone)}</p> : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild size="sm" className="bg-[#8a5a2f] text-[#fffdfa] hover:bg-[#744a26]">
                <Link href={place.path}>Details</Link>
              </Button>
              {place.locationHref ? (
                <Button asChild size="sm" variant="outline" className="border-[#cdb99e] bg-[#fbf3e8] text-[#5a3e24] hover:bg-[#f1e3d2]">
                  <a href={place.locationHref} target="_blank" rel="noreferrer noopener">
                    Map
                  </a>
                </Button>
              ) : null}
              {place.certificateHref ? (
                <Button asChild size="sm" variant="outline" className="border-[#cdb99e] bg-[#fbf3e8] text-[#5a3e24] hover:bg-[#f1e3d2]">
                  <a href={place.certificateHref} target="_blank" rel="noreferrer noopener">
                    Certificate
                  </a>
                </Button>
              ) : null}
              {place.website ? (
                <Button asChild size="sm" variant="ghost" className="text-[#5a3e24] hover:bg-[#f2e6d4]">
                  <a href={place.website} target="_blank" rel="noreferrer noopener">
                    {normalizeWebsiteLabel(place.website)}
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </Card>
      </article>
    );
  }

  return (
    <>
      <div id="kosher-directory" className="sr-only" />
      <section id="directory" className="grid gap-6" aria-label="Kosher places directory">
        <Card className="overflow-hidden rounded-[14px] border-[#d6cfbf] bg-[#fdf9f1] px-4 py-5 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset] sm:px-6 sm:py-6">
          <div className="grid gap-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end">
              <div className="space-y-3">
                <Badge className="rounded-full border-[#cbbca2] bg-[#efe3d2] text-[#4f5f72]">Filter the guide</Badge>
                <div className="space-y-2">
                  <h2 className="font-[family-name:var(--font-heading)] text-[clamp(1.8rem,4vw,2.55rem)] tracking-[-0.02em] text-[#23374d]">
                    One kosher directory, all neighborhoods
                  </h2>
                  <p className="max-w-2xl text-base leading-7 text-[#445365]">
                    Search by name, filter by neighborhood, and narrow by category without jumping between separate archive pages.
                  </p>
                </div>
              </div>
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5a6777]">Search the guide</span>
                <Input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search restaurants, bakeries, cafes, supervision..."
                />
              </label>
            </div>

            <div className="grid gap-5">
              <div className="grid gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5a6777]">Neighborhood</span>
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Neighborhood filter">
                  {NEIGHBORHOOD_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        "rounded-full border px-4 py-2.5 text-sm font-semibold tracking-[0.01em] transition",
                        selectedNeighborhood === option.value
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
                          : "border-[#ccbea6] bg-[#f7ecdb] text-[#5b4933] hover:border-[#baa88d] hover:bg-[#f0dfc8] hover:text-[#473724]",
                      )}
                      style={selectedNeighborhood === option.value ? { color: "#f8fbff" } : undefined}
                      onClick={() => setSelectedNeighborhood(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {tagOptions.length > 1 ? (
                <div className="grid gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5a6777]">Category</span>
                  <div className="flex flex-wrap gap-2" role="tablist" aria-label="Category filter">
                    {tagOptions
                      .filter((tag) => tag !== "all")
                      .map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className={cn(
                            "rounded-full border px-4 py-2.5 text-sm font-semibold tracking-[0.01em] transition",
                            selectedCategoryValue !== "all" && normalize(tag) === selectedCategoryValue
                              ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
                              : "border-[#ccbea6] bg-[#f7ecdb] text-[#5b4933] hover:border-[#baa88d] hover:bg-[#f0dfc8] hover:text-[#473724]",
                          )}
                          style={
                            selectedCategoryValue !== "all" && normalize(tag) === selectedCategoryValue
                              ? { color: "#f8fbff" }
                              : undefined
                          }
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

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#d4dbe2] pt-4">
                <p className="text-sm leading-6 text-[#4f5f72]">
                  Showing {filteredPlaces.length} of {places.length} listings
                  {selectedNeighborhood !== "all" ? ` in ${NEIGHBORHOOD_FULL_LABELS[selectedNeighborhood]}` : ""}.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setSelectedNeighborhood(defaultNeighborhood);
                    setSelectedCategory("all");
                  }}
                >
                  Reset filters
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {filteredPlaces.length === 0 ? (
          <Card className="rounded-[14px] border-[#d6cfbf] bg-[#fdf9f1] px-6 py-8 text-center shadow-[0_1px_0_rgba(255,255,255,0.7)_inset]">
            <p className="text-base leading-7 text-[#445365]">
              No kosher places match those filters right now. Try another neighborhood, category, or search term.
            </p>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filteredPlaces.map(renderPlaceCard)}</div>
        )}
      </section>
    </>
  );
}
