import type { Metadata } from "next";

import { KosherPlacesPage } from "@/components/kosher/kosher-places-page";

export const metadata: Metadata = {
  title: "Cherry Hill Kosher Places | Mekor Habracha",
  description: "Search and filter kosher restaurants, bakeries, cafes, and shops in Cherry Hill.",
};

export const dynamic = "force-dynamic";

export default async function CherryHillKosherPage() {
  return (
    <KosherPlacesPage
      currentPath="/cherry-hill"
      heading="Kosher Places: Cherry Hill"
      description="Browse all kosher places from the backend directory with live search and category filters."
      defaultNeighborhood="cherry-hill"
    />
  );
}
