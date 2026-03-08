import type { Metadata } from "next";
import Link from "next/link";

import { EventsCalendar } from "@/app/events/events-calendar";
import { MemberEventsSection } from "@/app/events/member-events-section";
import { NativeShell } from "@/components/navigation/native-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      <Card className="overflow-hidden px-6 py-7 sm:px-8 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-end">
          <div className="space-y-4">
            <Badge>Community Calendar</Badge>
            <div className="space-y-3">
              <h1 className="font-[family-name:var(--font-heading)] text-5xl leading-[0.94] tracking-[-0.04em] text-[var(--color-foreground)] sm:text-6xl">
                Community Events
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--color-muted)] sm:text-lg sm:leading-8">
                Synagogue-managed events appear first, followed by member-hosted events below.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Button asChild>
              <Link href="/account/member-events">Host a Member Event</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/account/member-events">Manage My Hosted Events</Link>
            </Button>
          </div>
        </div>
      </Card>
      <EventsCalendar events={events} />
      <MemberEventsSection />
    </NativeShell>
  );
}
