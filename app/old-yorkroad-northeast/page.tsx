import type { Metadata } from "next";

import { KosherPlacesPage } from "@/components/kosher/kosher-places-page";

export const metadata: Metadata = {
  title: "Kosher Places Directory | Mekor Habracha",
  description: "Browse kosher restaurants, bakeries, cafes, and shops grouped by location across the region.",
};

export const dynamic = "force-dynamic";

export default async function OldYorkRoadNortheastKosherPage() {
  return (
    <KosherPlacesPage
      currentPath="/old-yorkroad-northeast"
      heading="Kosher Places: Philadelphia Area"
      kicker="Kosher Dining Directory"
      description="Browse all kosher places grouped by location, then use the location dropdown to filter to one neighborhood whenever you want."
      highlights={[
        { label: "Restaurant favorites across all neighborhoods", tag: "restaurants" },
        { label: "Bakery and dessert spots", tag: "bakery" },
        { label: "Cafe picks and family-friendly options", tag: "cafe" },
        { label: "Community-verified supervision and map links", tag: "all" },
      ]}
      designTone="food"
      defaultNeighborhood="all"
      lastUpdatedKey="center-city"
    />
  );
}
