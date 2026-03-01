import type { Metadata } from "next";

import { KosherPlacesPage } from "@/components/kosher/kosher-places-page";

export const metadata: Metadata = {
  title: "Old York Road / Northeast Kosher Places | Mekor Habracha",
  description: "Search and filter kosher restaurants, bakeries, cafes, and shops in Old York Road and Northeast.",
};

export const dynamic = "force-dynamic";

export default async function OldYorkRoadNortheastKosherPage() {
  return (
    <KosherPlacesPage
      currentPath="/old-yorkroad-northeast"
      heading="Kosher Places: Old York Road / Northeast"
      description="Browse all kosher places from the backend directory with live search and category filters."
      defaultNeighborhood="old-yorkroad-northeast"
    />
  );
}
