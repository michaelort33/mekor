import type { Metadata } from "next";
import Link from "next/link";

import { KosherMapEmbed } from "@/components/kosher/kosher-map-embed";
import { SiteNavigation } from "@/components/navigation/site-navigation";
import { renderMirrorFallbackForPath } from "@/lib/native-routes/mirror-fallback";
import { isTeam0NativeRouteEnabled } from "@/lib/native-routes/team0-flags";

export const metadata: Metadata = {
  title: "Kosher Map | Mekor Habracha",
  description: "Explore kosher restaurants and markets across Philadelphia neighborhoods.",
};

export const dynamic = "force-dynamic";

const NEIGHBORHOOD_LINKS = [
  { href: "/center-city", label: "Center City & Vicinity" },
  { href: "/main-line-manyunk", label: "Main Line / Manyunk" },
  { href: "/old-yorkroad-northeast", label: "Old York Road / Northeast" },
  { href: "/cherry-hill", label: "Cherry Hill" },
];

export default async function KosherMapPage() {
  if (!isTeam0NativeRouteEnabled("/kosher-map")) {
    return renderMirrorFallbackForPath("/kosher-map");
  }

  return (
    <main className="kosher-map-page" data-native-nav="true">
      <SiteNavigation currentPath="/kosher-map" />
      <section className="kosher-map-page__content">
        <header className="kosher-map-page__header">
          <p className="kosher-map-page__kicker">Kosher Directory</p>
          <h1>Kosher Map</h1>
          <p>Use the interactive map and neighborhood pages to find kosher places across the region.</p>
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
