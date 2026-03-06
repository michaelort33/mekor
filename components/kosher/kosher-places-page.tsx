import Image from "next/image";

import { NativeShell } from "@/components/navigation/native-shell";
import { KosherDirectory } from "@/components/kosher/kosher-directory";
import { KosherHighlightFilters } from "@/components/kosher/kosher-highlight-filters";
import type { KosherNeighborhood } from "@/lib/kosher/extract";
import {
  type KosherDirectoryFreshnessKey,
  getKosherDirectoryLastUpdated,
  getManagedKosherPlaces,
} from "@/lib/kosher/store";

type KosherPlacesHighlight = {
  label: string;
  tag?: string;
};

type KosherPlacesPageProps = {
  currentPath: string;
  heading: string;
  description: string;
  defaultNeighborhood: KosherNeighborhood | "all";
  lastUpdatedKey?: KosherDirectoryFreshnessKey;
  kicker?: string;
  highlights?: KosherPlacesHighlight[];
  designTone?: "default" | "food";
};

const KOSHER_FALLBACK_IMAGE_SRC = "/images/kosher/fallback-food.svg";

function formatLastUpdatedDate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function newestSourceCapturedAt(places: { sourceCapturedAt: string | null }[]) {
  let newest: string | null = null;
  let newestTimestamp = 0;

  for (const place of places) {
    if (!place.sourceCapturedAt) {
      continue;
    }

    const timestamp = Date.parse(place.sourceCapturedAt);
    if (Number.isNaN(timestamp)) {
      continue;
    }

    if (!newest || timestamp > newestTimestamp) {
      newest = place.sourceCapturedAt;
      newestTimestamp = timestamp;
    }
  }

  return newest;
}

export async function KosherPlacesPage({
  currentPath,
  heading,
  description,
  defaultNeighborhood,
  lastUpdatedKey,
  kicker,
  highlights = [],
  designTone = "default",
}: KosherPlacesPageProps) {
  const places = await getManagedKosherPlaces();
  const showcasePlaces =
    defaultNeighborhood === "all"
      ? places.slice(0, 4)
      : places.filter((place) => place.neighborhood === defaultNeighborhood).slice(0, 4);
  const derivedLastUpdated = newestSourceCapturedAt(places);
  const rawLastUpdated =
    derivedLastUpdated ?? (lastUpdatedKey ? await getKosherDirectoryLastUpdated(lastUpdatedKey) : null);
  const lastUpdatedDate = formatLastUpdatedDate(rawLastUpdated);

  return (
    <NativeShell
      currentPath={currentPath}
      className={`kosher-places-page${designTone === "food" ? " kosher-places-page--food" : ""}`}
      contentClassName={`kosher-places${designTone === "food" ? " kosher-places--food" : ""}`}
    >
      <header className={`kosher-places__header${designTone === "food" ? " kosher-places__header--food" : ""}`}>
        {kicker ? <p className="kosher-places__kicker">{kicker}</p> : null}
        <h1>{heading}</h1>
        <p>{description}</p>
        {lastUpdatedDate ? <p className="kosher-places__last-updated">Last updated: {lastUpdatedDate}</p> : null}
        {highlights.length > 0 ? (
          <KosherHighlightFilters currentPath={currentPath} highlights={highlights} />
        ) : null}
        {showcasePlaces.length > 0 ? (
          <div className="kosher-places__showcase" aria-label="Featured kosher food spots">
            {showcasePlaces.map((place) => (
              <article key={`showcase-${place.path}`} className="kosher-places__showcase-item">
                <Image
                  src={place.heroImage || KOSHER_FALLBACK_IMAGE_SRC}
                  alt={place.title}
                  width={960}
                  height={720}
                  sizes="(max-width: 900px) 100vw, 33vw"
                />
                <div className="kosher-places__showcase-caption">
                  <span>{place.neighborhoodLabel}</span>
                  <strong>{place.title}</strong>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </header>
      <KosherDirectory places={places} defaultNeighborhood={defaultNeighborhood} />
    </NativeShell>
  );
}
