"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import styles from "@/components/home/upcoming-events-slider.module.css";

type UpcomingEventSlide = {
  image: string;
  alt: string;
  title: string;
  date: string;
  place: string;
  href: string;
};

type UpcomingEventsSliderProps = {
  events: UpcomingEventSlide[];
};

export function UpcomingEventsSlider({ events }: UpcomingEventsSliderProps) {
  const [index, setIndex] = useState(0);

  if (events.length === 0) {
    return (
      <div className={styles.body}>
        <p className={styles.kicker}>Upcoming events</p>
        <h2 className={styles.title}>Events are on the way</h2>
        <p className={styles.description}>Check our events page for new announcements and upcoming gatherings.</p>
        <Button asChild>
          <Link href="/events">View Events</Link>
        </Button>
      </div>
    );
  }

  const safeIndex = index >= events.length ? 0 : index;
  const active = events[safeIndex]!;
  const lastIndex = events.length - 1;

  return (
    <article className={styles.root} aria-label="Upcoming events slider">
      <div className={styles.media}>
        <Image src={active.image} alt={active.alt} width={1200} height={960} sizes="(max-width: 900px) 100vw, 50vw" />
      </div>
      <div className={styles.body}>
        <p className={styles.kicker}>Upcoming events</p>
        <h2 className={styles.title}>{active.title}</h2>
        <p className={styles.meta}>
          {active.date} · {active.place}
        </p>
        <p className={styles.description}>Browse details, timing, and RSVP from the live event page.</p>

        <div className={styles.controls}>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => setIndex((current) => (current <= 0 ? lastIndex : current - 1))}
            aria-label="Show previous upcoming event"
          >
            ←
          </button>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => setIndex((current) => (current >= lastIndex ? 0 : current + 1))}
            aria-label="Show next upcoming event"
          >
            →
          </button>
          <span className={styles.counter}>
            {safeIndex + 1}/{events.length}
          </span>
          <div className={styles.dots} aria-hidden="true">
            {events.map((event, eventIndex) => (
              <button
                key={event.href}
                type="button"
                className={`${styles.dot} ${eventIndex === safeIndex ? styles.dotActive : ""}`}
                onClick={() => setIndex(eventIndex)}
                aria-label={`Show slide ${eventIndex + 1}`}
              />
            ))}
          </div>
        </div>

        <div>
          <Button asChild>
            <Link href={active.href}>Event Details</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
