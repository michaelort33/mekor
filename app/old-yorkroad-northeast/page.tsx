import type { Metadata } from "next";

import { KosherPlacesPage } from "@/components/kosher/kosher-places-page";

export const metadata: Metadata = {
  title: "Old York Road/Northeast | Mekor Habracha",
  description: "Browse kosher listings for Old York Road and Northeast Philadelphia through Mekor Habracha's neighborhood guide.",
};

export const dynamic = "force-static";
export const revalidate = 3600;

export default async function OldYorkRoadNortheastKosherPage() {
  return (
    <KosherPlacesPage
      currentPath="/old-yorkroad-northeast"
      heading="Northeast Philly / Old York Road"
      kicker="Kosher Restaurants"
      description="Browse the Northeast Philly and Old York Road neighborhood listings in our kosher guide."
      defaultNeighborhood="old-yorkroad-northeast"
      neighborhoodLead="Get in Touch About Local Kashrut. Have questions, updates, or suggestions regarding our list of kosher-certified establishments? Send us a message-we'd love to hear from you!"
    />
  );
}
