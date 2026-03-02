import type { Metadata } from "next";

import { KosherPlacesPage } from "@/components/kosher/kosher-places-page";
import { renderMirrorRoute } from "@/lib/mirror/render-route";
import { getEffectiveRenderMode } from "@/lib/routing/render-mode";

export const metadata: Metadata = {
  title: "Center City Kosher Places | Mekor Habracha",
  description: "Search and filter kosher restaurants, bakeries, cafes, and shops in Center City and nearby.",
};

export const dynamic = "force-dynamic";

export default async function CenterCityKosherPage() {
  if (getEffectiveRenderMode("/center-city") === "mirror") {
    return renderMirrorRoute("/center-city");
  }

  return (
    <KosherPlacesPage
      currentPath="/center-city"
      heading="Kosher Places: Center City & Vicinity"
      description="Browse all kosher places from the backend directory with live search and category filters."
      defaultNeighborhood="center-city"
      lastUpdatedKey="center-city"
    />
  );
}
