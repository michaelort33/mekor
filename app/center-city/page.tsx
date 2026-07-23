import { KosherPlacesPage } from "@/components/kosher/kosher-places-page";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  path: "/center-city",
  title: "Kosher Restaurants | Mekor Habracha",
  description: "Search and filter kosher restaurants, bakeries, cafes, and shops across the Philadelphia area.",
});

export const dynamic = "force-static";
export const revalidate = 3600;

export default async function CenterCityKosherPage() {
  return (
    <KosherPlacesPage
      currentPath="/center-city"
      heading="Center City & Vicinity"
      kicker="Kosher Restaurants"
      defaultNeighborhood="all"
      lastUpdatedKey="center-city"
    />
  );
}
