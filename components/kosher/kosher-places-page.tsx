import { SiteNavigation } from "@/components/navigation/site-navigation";
import { KosherDirectory } from "@/components/kosher/kosher-directory";
import type { KosherNeighborhood } from "@/lib/kosher/extract";
import {
  type KosherDirectoryFreshnessKey,
  getKosherDirectoryLastUpdated,
  getManagedKosherPlaces,
} from "@/lib/kosher/store";

type KosherPlacesPageProps = {
  currentPath: string;
  heading: string;
  description: string;
  defaultNeighborhood: KosherNeighborhood | "all";
  lastUpdatedKey?: KosherDirectoryFreshnessKey;
};

function formatLastUpdatedDate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export async function KosherPlacesPage({
  currentPath,
  heading,
  description,
  defaultNeighborhood,
  lastUpdatedKey,
}: KosherPlacesPageProps) {
  const places = await getManagedKosherPlaces();
  const lastUpdatedDate = formatLastUpdatedDate(
    lastUpdatedKey ? await getKosherDirectoryLastUpdated(lastUpdatedKey) : null,
  );

  return (
    <main className="kosher-places-page" data-native-nav="true">
      <SiteNavigation currentPath={currentPath} />
      <section className="kosher-places">
        <header className="kosher-places__header">
          <h1>{heading}</h1>
          <p>{description}</p>
          {lastUpdatedDate ? <p className="kosher-places__last-updated">Last updated: {lastUpdatedDate}</p> : null}
        </header>
        <KosherDirectory places={places} defaultNeighborhood={defaultNeighborhood} />
      </section>
    </main>
  );
}
