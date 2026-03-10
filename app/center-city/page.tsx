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
      heading="Center City & Vicinity"
      kicker="Kosher Restaurants"
      description="Center City, Main Line, Old York Road, and Cherry Hill listings are all available in one guide. Search by name, narrow by neighborhood, and browse categories without leaving the page."
      designTone="food"
      defaultNeighborhood="all"
      lastUpdatedKey="center-city"
      contactTitle="Get in Touch About Local Kashrut"
      contactDescription="Have questions, updates, or suggestions regarding our list of kosher-certified establishments? Send us a message-we'd love to hear from you!"
    />
  );
}
