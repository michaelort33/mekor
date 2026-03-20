import Link from "next/link";
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

export async function KosherPlacesPage({
  currentPath,
  heading,
  description,
  defaultNeighborhood,
  lastUpdatedKey,
  kicker,
  designTone = "default",
  contactTitle = "Get in Touch About Local Kashrut",
  contactDescription = "Have questions, updates, or suggestions regarding our list of kosher-certified establishments? Send us a message-we'd love to hear from you!",
  neighborhoodLead,
}: KosherPlacesPageProps) {
  const isFoodTone = designTone === "food";
  const accentClass = isFoodTone ? "bg-[#8a5a2f] text-[#fffdfa] hover:bg-[#744a26]" : "bg-[#2f4d6d] text-[#f8fbff] hover:bg-[#284462]";
  const softButtonClass = isFoodTone
    ? "border-[#cdb99e] bg-[#fbf3e8] text-[#5a3e24] hover:bg-[#f1e3d2]"
    : "border-[#b8c4d1] bg-[#f4f6f8] text-[#2c4664] hover:bg-[#eceff3]";
  const places = process.env.DATABASE_URL ? await getManagedKosherPlaces() : [];
  const showcasePlaces =
    defaultNeighborhood === "all"
      ? places.slice(0, 4)
      : places.filter((place) => place.neighborhood === defaultNeighborhood).slice(0, 4);
  const rawLastUpdated =
    process.env.DATABASE_URL && lastUpdatedKey ? await getKosherDirectoryLastUpdated(lastUpdatedKey) : null;
  const lastUpdatedDate = formatLastUpdatedDate(rawLastUpdated);

  return (
    <NativeShell currentPath={currentPath} className="kosher-places-page" contentClassName="gap-6">
      <section className="overflow-hidden rounded-[14px] border border-[#d6cfbf] bg-[linear-gradient(160deg,#fbf6ee_0%,#f5ecde_100%)] px-5 py-6 shadow-[0_14px_32px_rgba(33,44,57,0.09)] sm:px-7 sm:py-8 lg:px-9 lg:py-9">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
          <div className="space-y-5">
            {kicker ? (
              <Badge className="rounded-full border-[#cbbca2] bg-[#efe3d2] px-3 py-1 text-[#4f5f72]">
                {kicker}
              </Badge>
            ) : null}
            <div className="space-y-4">
              <h1 className="font-[family-name:var(--font-heading)] text-[clamp(2rem,5.2vw,3.5rem)] leading-[0.98] tracking-[-0.03em] text-[#20354c]">
                {heading}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[#455365] sm:text-[1.05rem] sm:leading-8">
                {description}
              </p>
              {neighborhoodLead ? (
                <p className="max-w-2xl text-sm leading-6 text-[#556477]">{neighborhoodLead}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="sm" className={accentClass}>
                <a href="#directory">Browse the guide</a>
              </Button>
              <Button asChild size="sm" variant="outline" className={softButtonClass}>
                <a href="#map">Open the map</a>
              </Button>
            </div>
            <div className="rounded-[12px] border border-[#d8cfbe] bg-[#f7efe2] px-4 py-4 sm:px-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5a6777]">
                How to use this guide
              </p>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#49586a] sm:text-[15px]">
                <li>Search by restaurant name, supervision keyword, or address details.</li>
                <li>Filter by neighborhood and category to narrow options quickly.</li>
                <li>Use map + listings together to plan where to eat next.</li>
              </ul>
            </div>
            <p className="text-sm leading-6 text-[#586878]">
              {lastUpdatedDate ? `Guide last refreshed ${lastUpdatedDate}. ` : null}
              Each listing includes supervision notes, location details, and direct planning links.
            </p>
          </div>

          {showcasePlaces.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2" aria-label="Featured kosher food spots">
              {showcasePlaces.map((place) => (
                <article key={`showcase-${place.path}`} className="overflow-hidden rounded-[12px] border border-[#d8cfbe] bg-[#fbf6ec] shadow-[0_6px_18px_rgba(37,50,66,0.08)]">
                  <Image
                    src={place.heroImage || KOSHER_FALLBACK_IMAGE_SRC}
                    alt={place.title}
                    width={960}
                    height={720}
                    sizes="(max-width: 900px) 100vw, 33vw"
                    className="h-44 w-full object-cover sm:h-48"
                  />
                  <div className="space-y-2 px-4 py-4 sm:px-5">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#637286]">
                      {place.neighborhoodLabel}
                    </span>
                    <strong className="block text-[1.08rem] font-semibold tracking-[0.01em] text-[#24384f]">{place.title}</strong>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <KosherDirectory places={places} defaultNeighborhood={defaultNeighborhood} />

      <Card className="rounded-[14px] border-[#d6cfbf] bg-[#fdf9f1] px-5 py-6 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset] sm:px-7">
        <div className="space-y-3">
          <Badge className="rounded-full border-[#cbbca2] bg-[#efe3d2] px-3 py-1 text-[#4f5f72]">Local Kashrut</Badge>
          <h2 className="font-[family-name:var(--font-heading)] text-[clamp(1.8rem,3.3vw,2.35rem)] tracking-[-0.02em] text-[#23374d]">
            {contactTitle}
          </h2>
          <p className="max-w-3xl text-base leading-7 text-[#445365]">{contactDescription}</p>
          <p className="max-w-3xl text-sm leading-6 text-[#556477]">
            For general kosher questions, use Ask Mekor to browse prior answers or submit a new question. Use the
            form below for listing corrections, certification updates, or place-specific changes to this guide.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="sm" className={accentClass}>
              <Link href="/ask-mekor">Ask Mekor About Kashrut</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className={softButtonClass}>
              <Link href="/ask-mekor">Browse Ask Mekor</Link>
            </Button>
          </div>
        </div>
        <KosherInquiryForm
          sourcePath={currentPath}
          defaultNeighborhoodLabel={defaultNeighborhood === "all" ? "" : showcasePlaces[0]?.neighborhoodLabel}
        />
      </Card>

      <section id="map" className="grid gap-5 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,1.35fr)] lg:items-start">
        <Card className="h-full rounded-[14px] border-[#d6cfbf] bg-[#fdf9f1] px-5 py-6 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset] sm:px-7">
          <div className="space-y-4">
            <Badge className="rounded-full border-[#cbbca2] bg-[#efe3d2] px-3 py-1 text-[#4f5f72]">Map View</Badge>
            <h2 className="font-[family-name:var(--font-heading)] text-[clamp(1.8rem,3.3vw,2.35rem)] tracking-[-0.02em] text-[#23374d]">
              See the directory across the region
            </h2>
            <p className="text-base leading-7 text-[#445365]">
              Use the interactive map to orient yourself, then return to the listings for full details, supervision notes,
              and direct contact links.
            </p>
            <div className="space-y-2 text-sm leading-6 text-[#526173]">
              <p>Center City and nearby neighborhoods are included in one live guide.</p>
              <p>Use the filter rail above to narrow the results while keeping the map in view.</p>
            </div>
          </div>
        </Card>
        <Card className="overflow-hidden rounded-[14px] border-[#d6cfbf] bg-[#fdf9f1] p-3 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset] sm:p-4">
          <KosherMapEmbed />
        </Card>
      </section>
    </NativeShell>
  );
}
