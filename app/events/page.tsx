import type { Metadata } from "next";

import { EventsCalendar } from "@/app/events/events-calendar";
import { SiteNavigation } from "@/components/navigation/site-navigation";
import { getManagedEvents } from "@/lib/events/store";
import { renderMirrorRoute } from "@/lib/mirror/render-route";
import { getEffectiveRenderMode } from "@/lib/routing/render-mode";

export const metadata: Metadata = {
  title: "Events | Mekor Habracha",
  description: "Browse upcoming and recent Mekor Habracha events in calendar and list view.",
};

export const dynamic = "force-dynamic";

export default async function EventsHubPage() {
  if (getEffectiveRenderMode("/events") === "mirror") {
    return renderMirrorRoute("/events");
  }

  const events = await getManagedEvents();

  return (
    <main className="events-hub-page" data-native-nav="true">
      <SiteNavigation currentPath="/events" />
      <section className="events-hub">
        <header className="events-hub__header">
          <h1>Community Events</h1>
          <p>Browse all events in a calendar view and open each event page for full details.</p>
        </header>
        <EventsCalendar events={events} />
      </section>
    </main>
  );
}
