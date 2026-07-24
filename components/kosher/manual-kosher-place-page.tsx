import Link from "next/link";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { HeroSection, SectionCard } from "@/components/marketing/primitives";
import type { ManagedKosherPlace } from "@/lib/kosher/store";

export function ManualKosherPlacePage({ place }: { place: ManagedKosherPlace }) {
  return (
    <MarketingPageShell currentPath="/center-city">
      <HeroSection
        eyebrow={place.neighborhoodLabel}
        title={place.title}
        description={[place.summary, place.supervision].filter(Boolean)}
        image={place.heroImage ? { src: place.heroImage, alt: place.title } : undefined}
        actions={[
          { label: "Visit website", href: place.website },
          ...(place.locationHref ? [{ label: "Open map", href: place.locationHref }] : []),
        ]}
      />

      <SectionCard title="Details">
        <div className="grid gap-5 text-base leading-7 sm:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Address
            </p>
            <p>{place.address}</p>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Phone
            </p>
            <p>
              <a href={`tel:${place.phone}`}>{place.phone}</a>
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Supervision
            </p>
            <p>{place.supervision}</p>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Links
            </p>
            <p className="flex flex-wrap gap-4">
              <a href={place.website} target="_blank" rel="noreferrer noopener">
                Website
              </a>
              {place.certificateHref ? (
                <a href={place.certificateHref} target="_blank" rel="noreferrer noopener">
                  {place.certificateLabel}
                </a>
              ) : null}
            </p>
          </div>
        </div>
      </SectionCard>

      <p>
        <Link href="/center-city">Back to the kosher directory</Link>
      </p>
      <MarketingFooter />
    </MarketingPageShell>
  );
}
