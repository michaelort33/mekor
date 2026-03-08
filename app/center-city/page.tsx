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
      heading="Kosher Guide"
      kicker="Philadelphia Area"
      description="Find kosher dining across Philadelphia in one clear guide. Search by name, narrow by neighborhood, and browse categories without leaving the page."
      designTone="food"
      defaultNeighborhood="all"
      lastUpdatedKey="center-city"
    />
  );
}
