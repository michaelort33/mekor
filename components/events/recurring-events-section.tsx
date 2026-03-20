import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { RecurringEvent } from "@/lib/events/recurring";

type RecurringEventsSectionProps = {
  title: string;
  description: string;
  events: RecurringEvent[];
  compact?: boolean;
  showBrowseAll?: boolean;
};

export function RecurringEventsSection({
  title,
  description,
  events,
  compact = false,
  showBrowseAll = true,
}: RecurringEventsSectionProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#68798c]">Recurring Events</p>
        <h2 className="font-[family-name:var(--font-heading)] text-[clamp(1.75rem,3vw,2.4rem)] tracking-[-0.03em] text-[#22384f]">
          {title}
        </h2>
        <p className="max-w-3xl text-sm leading-7 text-[#526578] sm:text-base">{description}</p>
      </div>

      <div className="grid gap-4">
        {events.map((event) => (
          <Card
            key={event.path}
            className="overflow-hidden border-[#d6cfbf] bg-[#fffaf1] shadow-[0_1px_0_rgba(255,255,255,0.7)_inset]"
          >
            <div
              className={
                compact
                  ? "grid gap-4 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]"
                  : "grid gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]"
              }
            >
              <div className="relative min-h-[220px] overflow-hidden bg-[#eef4fb] lg:min-h-full">
                <Image
                  src={event.heroImage}
                  alt={event.title}
                  fill
                  sizes={compact ? "(max-width: 768px) 100vw, 280px" : "(max-width: 1024px) 100vw, 360px"}
                  className="object-cover object-center"
                  unoptimized
                />
              </div>

              <div className="grid content-start gap-4 px-5 py-5 sm:px-6">
                <div className="flex flex-wrap gap-2">
                  <Badge className="rounded-full border-[#c8b99d] bg-[#f1e3d0] px-3 py-1 text-[#5b6b7d]">
                    {event.cadenceLabel}
                  </Badge>
                  <Badge className="rounded-full border-[#c9d6e3] bg-[#edf4fb] px-3 py-1 text-[#315b85]">
                    Ongoing community event
                  </Badge>
                </div>

                <div className="space-y-3">
                  <h3 className="font-[family-name:var(--font-heading)] text-[clamp(1.5rem,2.4vw,2rem)] tracking-[-0.03em] text-[#23405e]">
                    {event.title}
                  </h3>
                  <p className="text-base leading-7 text-[#495d72]">{event.summary}</p>
                </div>

                <dl className="grid gap-3 text-sm leading-6 text-[#54677a] sm:grid-cols-2">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a8796]">Cadence</dt>
                    <dd>{event.scheduleLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a8796]">Location</dt>
                    <dd>{event.location}</dd>
                  </div>
                </dl>

                <div className="flex flex-wrap gap-3">
                  <Button asChild size="sm" className="bg-[#2f4d6d] text-[#f8fbff] hover:bg-[#284462]">
                    <Link href={event.path}>View details</Link>
                  </Button>
                  {showBrowseAll ? (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="border-[#b8c4d1] bg-[#f4f6f8] text-[#2c4664] hover:bg-[#eceff3]"
                    >
                      <Link href="/events">See all events</Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
