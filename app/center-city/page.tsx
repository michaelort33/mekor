import type { Metadata } from "next";

import { KosherPlacesPage } from "@/components/kosher/kosher-places-page";

export const metadata: Metadata = {
  title: "Kosher Restaurants | Mekor Habracha",
  description: "Search and filter kosher restaurants, bakeries, cafes, and shops across the Philadelphia area.",
};

export const dynamic = "force-static";
export const revalidate = 3600;

export default async function CenterCityKosherPage() {
  return (
    <KosherPlacesPage
      currentPath="/center-city"
      heading="Kosher Restaurants"
      kicker="Philadelphia Area"
      description="Find kosher dining across all neighborhoods. Filter by location, category, or search by name."
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
