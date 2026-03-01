"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { ManagedEvent } from "@/lib/events/store";

type EventsCalendarProps = {
  events: ManagedEvent[];
};

type MonthBucket = {
  key: string;
  label: string;
  firstDay: Date;
  daysInMonth: number;
  startsOn: number;
  byDay: Record<number, ManagedEvent[]>;
  events: ManagedEvent[];
};

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

function dayNumber(dateIso: string | null) {
  if (!dateIso) {
    return null;
  }
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.getUTCDate();
}

function buildMonthBuckets(events: ManagedEvent[]): MonthBucket[] {
  const byKey = new Map<string, MonthBucket>();

  for (const event of events) {
    if (!event.startAt) {
      continue;
    }

    const start = new Date(event.startAt);
    if (Number.isNaN(start.getTime())) {
      continue;
    }

    const firstDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const key = monthKey(firstDay);
    const existing = byKey.get(key);
    const day = start.getUTCDate();

    if (existing) {
      existing.events.push(event);
      if (!existing.byDay[day]) {
        existing.byDay[day] = [];
      }
      existing.byDay[day].push(event);
      continue;
    }

    byKey.set(key, {
      key,
      label: monthLabel(firstDay),
      firstDay,
      daysInMonth: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate(),
      startsOn: firstDay.getUTCDay(),
      byDay: { [day]: [event] },
      events: [event],
    });
  }

  return [...byKey.values()].sort((a, b) => a.firstDay.getTime() - b.firstDay.getTime());
}

export function EventsCalendar({ events }: EventsCalendarProps) {
  const months = useMemo(() => buildMonthBuckets(events), [events]);
  const [selectedMonthKey, setSelectedMonthKey] = useState(months[0]?.key ?? "");
  const selectedMonth = months.find((month) => month.key === selectedMonthKey) ?? months[0] ?? null;

  if (!selectedMonth) {
    return <p className="events-hub__empty">No event dates are currently available.</p>;
  }

  const leadingEmptyCells = Array.from({ length: selectedMonth.startsOn }, (_, index) => (
    <li key={`empty-${index}`} className="events-hub__day events-hub__day--empty" />
  ));

  const dayCells = Array.from({ length: selectedMonth.daysInMonth }, (_, index) => {
    const day = index + 1;
    const dayEvents = selectedMonth.byDay[day] ?? [];

    return (
      <li key={day} className="events-hub__day">
        <div className="events-hub__day-number">{day}</div>
        {dayEvents.length > 0 ? (
          <div className="events-hub__day-count">{dayEvents.length}</div>
        ) : null}
      </li>
    );
  });

  return (
    <section className="events-hub__calendar-block" aria-label="Events calendar">
      <div className="events-hub__month-tabs">
        {months.map((month) => (
          <button
            key={month.key}
            type="button"
            className={`events-hub__month-tab${selectedMonth.key === month.key ? " is-active" : ""}`}
            onClick={() => setSelectedMonthKey(month.key)}
          >
            {month.label}
          </button>
        ))}
      </div>

      <ul className="events-hub__weekday-row" aria-hidden="true">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <li key={day}>{day}</li>
        ))}
      </ul>

      <ul className="events-hub__calendar-grid">
        {leadingEmptyCells}
        {dayCells}
      </ul>

      <div className="events-hub__event-list">
        {selectedMonth.events.map((event) => (
          <article key={event.path} className="events-hub__event-card">
            <div className="events-hub__event-meta">
              <span>{event.shortDate || dayNumber(event.startAt)}</span>
              {event.location ? <span>{event.location}</span> : null}
              {event.isClosed ? <span className="events-hub__closed-badge">Closed</span> : null}
            </div>
            <h3>{event.title}</h3>
            {event.timeLabel ? <p>{event.timeLabel}</p> : null}
            <Link href={event.path} className="events-hub__event-link">
              View event
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
