import Image from "next/image";
import Link from "next/link";

import { EventSignupPanel } from "@/components/events/event-signup-panel";
import { SiteNavigation } from "@/components/navigation/site-navigation";
import { buildEventStructuredData, serializeJsonLd } from "@/lib/seo/structured-data";
import type { EventTemplateData } from "@/lib/templates/template-data";

type EventTemplateProps = {
  data: EventTemplateData;
  signupAuthenticated: boolean;
};

export function EventTemplate({ data, signupAuthenticated }: EventTemplateProps) {
  const mapsHref = data.location
    ? `https://maps.google.com/?q=${encodeURIComponent(data.location)}`
    : null;
  const structuredData = buildEventStructuredData(data);

  return (
    <main className="template-page template-page--event" data-native-nav="true">
      {structuredData ? (
        <script type="application/ld+json">{serializeJsonLd(structuredData)}</script>
      ) : null}
      <SiteNavigation currentPath={data.path} />

      <article className="template-card">
        <header className="template-card__header">
          <p className="template-card__eyebrow">Event</p>
          <h1>{data.title}</h1>
          <p>{data.subtitle}</p>
        </header>

        {data.heroImage ? (
          <div className="template-card__hero">
            <Image
              src={data.heroImage}
              alt={data.title}
              width={1200}
              height={675}
              sizes="(max-width: 920px) 100vw, 920px"
              className="template-card__hero-image template-card__hero-image--event"
              unoptimized
            />
          </div>
        ) : null}

        <dl className="template-facts">
          {data.shortDate ? (
            <div>
              <dt>Date</dt>
              <dd>{data.shortDate}</dd>
            </div>
          ) : null}
          {data.timeLabel ? (
            <div>
              <dt>Time</dt>
              <dd>{data.timeLabel}</dd>
            </div>
          ) : null}
          {data.location ? (
            <div>
              <dt>Location</dt>
              <dd>{data.location}</dd>
            </div>
          ) : null}
          {data.isClosed ? (
            <div>
              <dt>Status</dt>
              <dd>{data.isPast ? "This event has passed" : "Registration is closed"}</dd>
            </div>
          ) : null}
        </dl>

        {data.schedule && data.schedule.length > 0 ? (
          <section className="template-event-schedule" aria-label="Event schedule">
            <h2>Schedule</h2>
            {data.schedule.map((day) => (
              <div key={day.dayLabel} className="template-event-schedule__day">
                <h3>{day.dayLabel}</h3>
                <ul>
                  {day.items.map((item) => (
                    <li key={`${item.time}-${item.label}`}>
                      <span className="template-event-schedule__time">{item.time}</span>
                      <span className="template-event-schedule__item">{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ) : null}

        <section className="template-content" aria-label="Event details">
          {data.about.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>

        <EventSignupPanel
          eventId={data.eventId}
          isClosed={data.isClosed}
          isPast={data.isPast}
          isAuthenticated={signupAuthenticated}
        />

        <div className="template-card__source template-card__source--actions">
          <Link href={data.seeOtherEventsHref}>See other events</Link>
          {mapsHref ? (
            <a href={mapsHref} target="_blank" rel="noreferrer noopener">
              Open location in maps
            </a>
          ) : null}
        </div>
      </article>
    </main>
  );
}
