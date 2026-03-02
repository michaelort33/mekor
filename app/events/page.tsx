import type { Metadata } from "next";

import { EventsCalendar } from "@/app/events/events-calendar";
import { NativeShell } from "@/components/navigation/native-shell";
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
    <NativeShell currentPath="/events" className="events-hub-page" contentClassName="events-hub">
      <header className="events-hub__header">
        <h1>Community Events</h1>
        <p>Browse all events in a calendar view and open each event page for full details.</p>
      </header>
      <EventsCalendar events={events} />
    </NativeShell>
  );
}
