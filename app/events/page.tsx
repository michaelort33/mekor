import type { Metadata } from "next";
import Link from "next/link";

import { EventsCalendar } from "@/app/events/events-calendar";
import { MemberEventsSection } from "@/app/events/member-events-section";
import { NativeShell } from "@/components/navigation/native-shell";
import { getManagedEvents } from "@/lib/events/store";

export const metadata: Metadata = {
  title: "Events | Mekor Habracha",
  description: "Browse upcoming and recent Mekor Habracha events in calendar and list view.",
};

export const dynamic = "force-dynamic";

export default async function EventsHubPage() {
  const events = await getManagedEvents();

  return (
    <NativeShell currentPath="/events" className="events-hub-page" contentClassName="events-hub">
      <header className="events-hub__header">
        <h1>Community Events</h1>
        <p>Synagogue-managed events appear first, followed by member-hosted events below.</p>
        <div className="events-hub__header-actions">
          <Link href="/account/member-events" className="events-hub__header-action-primary">
            Host a Member Event
          </Link>
          <Link href="/account/member-events" className="events-hub__header-action-secondary">
            Manage My Hosted Events
          </Link>
        </div>
      </header>
      <EventsCalendar events={events} />
      <MemberEventsSection />
    </NativeShell>
  );
}
