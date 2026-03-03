import type { Metadata } from "next";
import Link from "next/link";

import { KosherMapEmbed } from "@/components/kosher/kosher-map-embed";
import { SiteNavigation } from "@/components/navigation/site-navigation";

export const metadata: Metadata = {
  title: "Kosher Map | Mekor Habracha",
  description: "Explore kosher restaurants and markets across Philadelphia neighborhoods.",
};

export const dynamic = "force-static";
export const revalidate = 3600;

const NEIGHBORHOOD_LINKS = [
  { href: "/center-city", label: "All Neighborhoods" },
  { href: "/center-city?neighborhood=center-city#kosher-directory", label: "Center City & Vicinity" },
  { href: "/center-city?neighborhood=main-line-manyunk#kosher-directory", label: "Main Line / Manyunk" },
  { href: "/center-city?neighborhood=old-yorkroad-northeast#kosher-directory", label: "Old York Road / Northeast" },
  { href: "/center-city?neighborhood=cherry-hill#kosher-directory", label: "Cherry Hill" },
];

export default async function KosherMapPage() {
  return (
    <main className="kosher-map-page" data-native-nav="true">
      <SiteNavigation currentPath="/kosher-map" />
      <section className="kosher-map-page__content">
        <header className="kosher-map-page__header">
          <p className="kosher-map-page__kicker">Kosher Directory</p>
          <h1>Kosher Map</h1>
          <p>
            Use the interactive map and the unified kosher directory to browse all neighborhoods together, or jump
            directly into a single location filter.
          </p>
        </header>

        <KosherMapEmbed />

        <div className="kosher-map-page__regions" aria-label="Neighborhood directories">
          {NEIGHBORHOOD_LINKS.map((region) => (
            <Link key={region.href} href={region.href}>
              {region.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
