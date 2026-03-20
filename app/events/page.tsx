import type { Metadata } from "next";
import Link from "next/link";

import { EventsCalendar } from "@/app/events/events-calendar";
import { RecurringEventsSection } from "@/components/events/recurring-events-section";
import { MemberEventsSection } from "@/app/events/member-events-section";
import { NativeShell } from "@/components/navigation/native-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RECURRING_EVENTS } from "@/lib/events/recurring";
import { getManagedEvents } from "@/lib/events/store";

export const metadata: Metadata = {
  title: "Events | Mekor Habracha",
  description: "Browse upcoming and recent Mekor Habracha events in calendar and list view.",
};

export const dynamic = "force-dynamic";

export default async function EventsHubPage() {
  const events = await getManagedEvents();

  return (
    <NativeShell currentPath="/events" className="events-hub-page" contentClassName="events-hub gap-6">
      <Card className="events-hub__hero">
        <div className="events-hub__hero-grid">
          <div className="events-hub__header">
            <Badge>what&apos;s happening?</Badge>
            <h1>Discover Our Events</h1>
            <p>
              Synagogue-managed events appear first, followed by member-hosted events below. Take a look at our
              calendar below, or add our Google Calendar to yours.
            </p>
          </div>

          <div className="events-hub__header-actions">
            <Button asChild className="events-hub__header-action-primary">
              <Link href="/account/member-events">Host a Member Event</Link>
            </Button>
            <Button asChild variant="outline" className="events-hub__header-action-secondary">
              <Link href="/account/member-events">Manage My Hosted Events</Link>
            </Button>
          </div>
        </div>
      </Card>
      <EventsCalendar
        events={events}
        title="Events"
        emptyMessage="There are no events scheduled right now. Check back later."
      />
      <RecurringEventsSection
        title="Recurring Community Events"
        description="Some gatherings happen on an ongoing monthly cadence even when the next exact date has not been posted yet. Keep these on your radar alongside the dated calendar above."
        events={RECURRING_EVENTS}
        showBrowseAll={false}
      />
      <MemberEventsSection />
    </NativeShell>
  );
}
