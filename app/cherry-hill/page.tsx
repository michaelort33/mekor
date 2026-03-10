import type { Metadata } from "next";

import { KosherPlacesPage } from "@/components/kosher/kosher-places-page";

export const metadata: Metadata = {
  title: "Cherry Hill | Mekor Habracha",
  description: "Browse kosher listings for Cherry Hill through Mekor Habracha's neighborhood guide.",
};

export const dynamic = "force-static";
export const revalidate = 3600;

export default async function CherryHillKosherPage() {
  return (
    <KosherPlacesPage
      currentPath="/cherry-hill"
      heading="Cherry Hill"
      kicker="Kosher Restaurants"
      description="Browse the Cherry Hill neighborhood listings in our kosher guide."
      defaultNeighborhood="cherry-hill"
      neighborhoodLead="Get in Touch About Local Kashrut. Have questions, updates, or suggestions regarding our list of kosher-certified establishments? Send us a message-we'd love to hear from you!"
    />
  );
}
