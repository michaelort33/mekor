import type { Metadata } from "next";

import { RabbiDeskPodcastList } from "@/components/podcast/rabbi-desk-podcast-list";
import { SiteNavigation } from "@/components/navigation/site-navigation";

export const metadata: Metadata = {
  title: "From The Rabbi's Desk | Mekor Habracha",
  description: "Listen to the latest podcast episodes from Mekor Habracha with search and archive browsing.",
};

export const dynamic = "force-dynamic";

export default async function FromTheRabbisDeskPage() {
  return (
    <main className="rabbi-desk-page" data-native-nav="true">
      <SiteNavigation currentPath="/from-the-rabbi-s-desk" />
      <section className="rabbi-desk-page__content">
        <header className="rabbi-desk-page__header">
          <p className="rabbi-desk-page__kicker">Teachings</p>
          <h1>From The Rabbi&apos;s Desk</h1>
          <p>Browse podcast episodes, search by title or description, and listen directly from this page.</p>
        </header>
        <RabbiDeskPodcastList />
      </section>
    </main>
  );
}
