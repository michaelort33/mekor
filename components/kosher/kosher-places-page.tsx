import Image from "next/image";

import { KosherDirectory } from "@/components/kosher/kosher-directory";
import { KosherMapEmbed } from "@/components/kosher/kosher-map-embed";
import { NativeShell } from "@/components/navigation/native-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KosherInquiryForm } from "@/components/forms/kosher-inquiry-form";
import type { KosherNeighborhood } from "@/lib/kosher/neighborhoods";
import {
  type KosherDirectoryFreshnessKey,
  getKosherDirectoryLastUpdated,
  getManagedKosherPlaces,
} from "@/lib/kosher/store";

type KosherPlacesPageProps = {
  currentPath: string;
  heading: string;
  description: string;
  defaultNeighborhood: KosherNeighborhood | "all";
  lastUpdatedKey?: KosherDirectoryFreshnessKey;
  kicker?: string;
  designTone?: "default" | "food";
  contactTitle?: string;
  contactDescription?: string;
  neighborhoodLead?: string;
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
  contactTitle = "Get in Touch About Local Kashrut",
  contactDescription = "Have questions, updates, or suggestions regarding our list of kosher-certified establishments? Send us a message-we'd love to hear from you!",
  neighborhoodLead,
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
  const neighborhoodCount = new Set(places.map((place) => place.neighborhood)).size;
  const categoryCount = new Set(places.flatMap((place) => place.tags.map((tag) => tag.toLowerCase()))).size;

  return (
    <NativeShell currentPath={currentPath} className="kosher-places-page" contentClassName="gap-8">
      <section className="relative isolate overflow-hidden rounded-[40px] border border-[var(--color-border)] bg-[linear-gradient(135deg,rgba(17,35,59,0.95),rgba(44,70,100,0.92))] px-6 py-8 [color:#f8fbff] shadow-[0_42px_100px_-60px_rgba(15,23,42,0.6)] sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(192,155,96,0.26),transparent_30%)]" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-end">
          <div className="space-y-5">
            {kicker ? <Badge className="border-white/15 bg-white/10 text-[rgba(255,255,255,0.78)]">{kicker}</Badge> : null}
            <div className="space-y-4">
              <h1 className="font-[family-name:var(--font-heading)] text-5xl leading-[0.92] tracking-[-0.04em] sm:text-6xl">
                {heading}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[rgba(255,255,255,0.8)] sm:text-lg sm:leading-8">
                {description}
              </p>
              {neighborhoodLead ? (
                <p className="max-w-2xl text-sm leading-6 text-[rgba(255,255,255,0.72)]">{neighborhoodLead}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="sm">
                <a href="#directory">Browse the guide</a>
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-white/20 bg-white/10 hover:bg-white/18"
                style={{ color: "#f8fbff" }}
              >
                <a href="#map">Open the map</a>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Card className="border-white/12 bg-white/10 px-3 py-3 [color:#f8fbff] shadow-none sm:px-4 sm:py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[rgba(255,255,255,0.6)]">Listings</p>
                <p className="mt-2 font-[family-name:var(--font-heading)] text-4xl">{places.length}</p>
              </Card>
              <Card className="border-white/12 bg-white/10 px-3 py-3 [color:#f8fbff] shadow-none sm:px-4 sm:py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[rgba(255,255,255,0.6)]">Neighborhoods</p>
                <p className="mt-2 font-[family-name:var(--font-heading)] text-4xl">{neighborhoodCount}</p>
              </Card>
              <Card className="col-span-2 border-white/12 bg-white/10 px-3 py-3 [color:#f8fbff] shadow-none sm:col-span-1 sm:px-4 sm:py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[rgba(255,255,255,0.6)]">Categories</p>
                <p className="mt-2 font-[family-name:var(--font-heading)] text-4xl">{categoryCount}</p>
              </Card>
            </div>
            <p className="text-sm leading-6 text-[rgba(255,255,255,0.66)]">
              {lastUpdatedDate ? `Last updated ${lastUpdatedDate}. ` : null}
              Listings include community-tracked supervision notes, location details, and direct links for planning.
            </p>
          </div>

          {showcasePlaces.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2" aria-label="Featured kosher food spots">
              {showcasePlaces.map((place) => (
                <article key={`showcase-${place.path}`} className="overflow-hidden rounded-[26px] border border-white/12 bg-white/8">
                  <Image
                    src={place.heroImage || KOSHER_FALLBACK_IMAGE_SRC}
                    alt={place.title}
                    width={960}
                    height={720}
                    sizes="(max-width: 900px) 100vw, 33vw"
                    className="h-44 w-full object-cover"
                  />
                  <div className="space-y-2 px-4 py-4">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-[rgba(255,255,255,0.56)]">
                      {place.neighborhoodLabel}
                    </span>
                    <strong className="block text-lg font-semibold tracking-[0.01em]">{place.title}</strong>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <KosherDirectory places={places} defaultNeighborhood={defaultNeighborhood} />

      <Card className="px-6 py-6 sm:px-7">
        <div className="space-y-3">
          <Badge>Local Kashrut</Badge>
          <h2 className="font-[family-name:var(--font-heading)] text-3xl tracking-[-0.03em] text-[var(--color-foreground)]">
            {contactTitle}
          </h2>
          <p className="max-w-3xl text-base leading-7 text-[var(--color-muted)]">{contactDescription}</p>
        </div>
        <KosherInquiryForm
          sourcePath={currentPath}
          defaultNeighborhoodLabel={defaultNeighborhood === "all" ? "" : showcasePlaces[0]?.neighborhoodLabel}
        />
      </Card>

      <section id="map" className="grid gap-6 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,1.35fr)] lg:items-start">
        <Card className="h-full px-6 py-6 sm:px-7">
          <div className="space-y-4">
            <Badge>Map View</Badge>
            <h2 className="font-[family-name:var(--font-heading)] text-4xl tracking-[-0.03em] text-[var(--color-foreground)]">
              See the directory across the region
            </h2>
            <p className="text-base leading-7 text-[var(--color-muted)]">
              Use the interactive map to orient yourself, then return to the listings for full details, supervision notes,
              and direct contact links.
            </p>
            <div className="space-y-2 text-sm leading-6 text-[var(--color-muted)]">
              <p>Center City and nearby neighborhoods are included in one live guide.</p>
              <p>Use the filter rail above to narrow the results while keeping the map in view.</p>
            </div>
          </div>
        </Card>
        <Card className="overflow-hidden p-3">
          <KosherMapEmbed />
        </Card>
      </section>
    </NativeShell>
  );
}
