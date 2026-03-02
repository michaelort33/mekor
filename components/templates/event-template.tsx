import Image from "next/image";
import Link from "next/link";

import { SiteNavigation } from "@/components/navigation/site-navigation";
import type { EventTemplateData } from "@/lib/templates/template-data";

type EventTemplateProps = {
  data: EventTemplateData;
};

export function EventTemplate({ data }: EventTemplateProps) {
  return (
    <main className="template-page template-page--event" data-native-nav="true">
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
              <dd>Registration is closed</dd>
            </div>
          ) : null}
        </dl>

        <section className="template-content" aria-label="Event details">
          {data.about.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>

        <p className="template-card__source">
          <Link href={data.seeOtherEventsHref}>See other events</Link>
        </p>
      </article>
    </main>
  );
}
