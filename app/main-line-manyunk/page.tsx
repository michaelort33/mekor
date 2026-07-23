import type { Metadata } from "next";

import { KosherPlacesPage } from "@/components/kosher/kosher-places-page";

export const metadata: Metadata = {
  title: "Main Line/Manyunk | Mekor Habracha",
  description: "Browse kosher listings for Main Line and Manyunk through Mekor Habracha's neighborhood guide.",
};

export const dynamic = "force-static";
export const revalidate = 3600;

export default async function MainLineManyunkKosherPage() {
  return (
    <KosherPlacesPage
      currentPath="/main-line-manyunk"
      heading="Main Line/Manyunk"
      kicker="Kosher Restaurants"
      defaultNeighborhood="main-line-manyunk"
    />
  );
}
