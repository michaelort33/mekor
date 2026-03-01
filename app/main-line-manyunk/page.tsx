import type { Metadata } from "next";

import { KosherPlacesPage } from "@/components/kosher/kosher-places-page";

export const metadata: Metadata = {
  title: "Main Line / Manyunk Kosher Places | Mekor Habracha",
  description: "Search and filter kosher restaurants, bakeries, cafes, and shops on the Main Line and Manyunk.",
};

export const dynamic = "force-dynamic";

export default async function MainLineManyunkKosherPage() {
  return (
    <KosherPlacesPage
      currentPath="/main-line-manyunk"
      heading="Kosher Places: Main Line / Manyunk"
      description="Browse all kosher places from the backend directory with live search and category filters."
      defaultNeighborhood="main-line-manyunk"
    />
  );
}
