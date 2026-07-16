import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { CurrentCivilYear, HebrewDateFooter } from "@/components/calendar/hebrew-date-footer";
import { HomeContactForm } from "@/components/home/home-contact-form";
import { HomeNewsletterForm } from "@/components/home/home-newsletter-form";
import { BrandedLink } from "@/components/marketing/primitives";
import { SiteNavigation } from "@/components/navigation/site-navigation";
import { getManagedEvents, type ManagedEvent } from "@/lib/events/store";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import styles from "@/app/page.module.css";

export const dynamic = "force-dynamic";

const HERO_IMAGE = "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/c2c6235de9c6d719cd098e19d77b7f21c18899f1-11062b_8135b27108d04d2a97adc750a341fb79-mv2.jpeg";
const DAVEING_IMAGE = "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/b562092e8484e9d5c6e62671c670e606b2d338cc-92f487_34e64b1fb2e94c56886578290ef2bcd0-mv2.jpeg";
const ERUV_CAMPAIGN_IMAGE =
  "https://storage.googleapis.com/download/storage/v1/b/tcf-backend-prod.appspot.com/o/centercityeruv-1782322025933.jpg?generation=1782322026074279&alt=media";
const MAP_EMBED_SRC =
  "https://www.google.com/maps?q=1500+Walnut+St+Suite+206+Philadelphia+PA+19102&output=embed";

const RABBIS = [
  {
    role: "Senior Rabbi",
    name: "Rabbi Eliezer Hirsch",
    bio: "Rabbi Eliezer Hirsch is Mekor Habracha\u2019s spiritual leader and founding rabbi. Since its inception...",
    image:
      "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/ef834ae06e3c7cf8ff31c0d7f7ab16cf19592877-92f487_d26f360d09cc45e4bebe89d9f14643d3-mv2-copy2-Medium-.jpg",
    alt: "Rabbi Eliezer Hirsch",
    profileHref: "/our-rabbis#rabbi-eliezer-hirsch",
    links: [
      { label: "Podcast", href: "https://rabbiehirsch.castos.com/", brand: "podcast" },
      { label: "Substack", href: "https://rabbieliezerhirsch.substack.com/", brand: "substack" },
      { label: "Books", href: "https://www.amazon.com/Rabbi-Eliezer-Hirsch/e/B0876V66RG%3Fref=dbs_a_mng_rwt_scns_share", brand: "amazon" },
    ],
  },
  {
    role: "Associate Rabbi",
    name: "Rabbi Steven Gotlib",
    bio: "Rabbi Steven Gotlib is Associate Rabbi at Mekor Habracha/Center City Synagogue\u200b and Marketing Manager...",
    image:
      "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/34434149afbb96abbd5c8c3779b55dde432d98e9-R-Gotlib.jpg",
    alt: "Rabbi Steven Gotlib",
    profileHref: "/our-rabbis#rabbi-steven-gotlib",
    links: [
      { label: "Substack", href: "https://rabbistevengotlib.substack.com/", brand: "substack" },
      { label: "18Forty", href: "https://18forty.org/author-name/steven-gotlib/", brand: "eighteenforty" },
      { label: "Facebook", href: "https://www.facebook.com/StevenJGotlib/", brand: "facebook" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/steven-j-gotlib/", brand: "linkedin" },
    ],
  },
] as const;

const SOCIAL_LINKS = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/mekorhabracha/",
    iconPath:
      "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/channel/UCfj7vuvPA80HMVN-09ZxOHA",
    iconPath:
      "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/groups/19458667730/?hoisted_section_header_type=recently_seen&multi_permalinks=10160757013487731",
    iconPath:
      "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath("/");
  return buildDocumentMetadata(document);
}

const HOME_EVENTS_LIMIT = 5;

function UpcomingEventsList({
  events,
  loading = false,
}: {
  events: ManagedEvent[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className={styles.eventsList} aria-busy="true">
        <p className={styles.eventsEmpty}>Loading upcoming events…</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className={styles.eventsList}>
        <p className={styles.eventsEmpty}>
          No upcoming events are posted right now — check the <Link href="/events">events page</Link> for the latest.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.eventsList}>
      <ul className={styles.eventRows}>
        {events.map((event) => {
          const date = event.startAt ? new Date(event.startAt) : null;
          const hasDate = date !== null && !Number.isNaN(date.getTime());
          const meta = [event.timeLabel, event.location].map((value) => value?.trim()).filter(Boolean).join(" · ");

          return (
            <li key={event.path} className={styles.eventRow}>
              <div className={styles.eventDate}>
                {hasDate ? (
                  <>
                    <span className={styles.eventMonth}>
                      {new Intl.DateTimeFormat("en-US", { month: "short" }).format(date)}
                    </span>
                    <span className={styles.eventDay}>
                      {new Intl.DateTimeFormat("en-US", { day: "numeric" }).format(date)}
                    </span>
                  </>
                ) : (
                  <span className={styles.eventDateText}>{event.shortDate || "TBD"}</span>
                )}
              </div>
              <div className={styles.eventInfo}>
                <Link href={event.path} className={styles.eventName}>
                  {event.title}
                </Link>
                {meta ? <p className={styles.eventMeta}>{meta}</p> : null}
              </div>
            </li>
          );
        })}
      </ul>
      <Link href="/events" className={styles.eventsMore}>
        View all events
      </Link>
    </div>
  );
}

async function HomeUpcomingEvents() {
  const upcoming = (await getManagedEvents()).filter((event) => !event.isPast).slice(0, HOME_EVENTS_LIMIT);

  return <UpcomingEventsList events={upcoming} />;
}

export default function HomePage() {
  return (
    <main className={styles.page}>
      <SiteNavigation currentPath="/" />

      <section className={styles.heroSection}>
        <Image
          src={HERO_IMAGE}
          alt="Prayer at the Western Wall"
          fill
          priority
          sizes="100vw"
          className={styles.heroImage}
        />
        <div className={styles.heroOverlay} />
        <div className={styles.heroInner}>
          <p className={styles.heroEyebrow}>Welcome to</p>
          <h1 className={styles.heroTitle}>Mekor Habracha</h1>
          <div className={styles.heroDivider} />
          <p className={styles.heroSubtitle}>Center City Synagogue</p>
          <a className={styles.heroArrow} href="#about" aria-label="Jump to about section">
            <span aria-hidden="true">⌄</span>
          </a>
        </div>
      </section>

      <section id="about" className={styles.aboutSection}>
        <div className={styles.container}>
          <div className={styles.aboutGrid}>
            <div className={styles.aboutCopy}>
              <h2>A Welcoming Community</h2>
              <p>
                <Link href="/about-us">Mekor Habracha / Center City Synagogue</Link> is a vibrant, inclusive Modern
                Orthodox community located in the heart of Center City, Philadelphia.
              </p>
              <p>
                We offer a wide range of religious, educational, and social opportunities for a diverse and growing
                membership. Visitors, whether from across the street or across the world, are always warmly welcomed.
              </p>
              <p>
                Our rabbis, <Link href="/our-rabbis">Rabbi Hirsch and Rabbi Gotlib</Link>, are always happy to connect.
              </p>
            </div>

            <div className={styles.videoShell}>
              <iframe
                src="https://www.youtube.com/embed/aieR-a2z1RY"
                title="Mekor Habracha - Center City Synagogue"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.supportSection} aria-labelledby="home-support-title">
        <div className={styles.container}>
          <div className={styles.supportPanel}>
            <div className={styles.supportCopy}>
              <h2 id="home-support-title">Support Jewish life in Center City</h2>
              <p>
                Your contribution sustains daily minyanim, Torah learning, community programming, and a welcoming
                home for members and visitors.
              </p>
            </div>
            <div className={styles.supportActions}>
              <Link href="/donations" className={styles.supportPrimary}>
                Donate or sponsor
              </Link>
              <Link href="/kiddush" className={styles.supportSecondary}>
                Sponsor a Kiddush
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.eruvSection}>
        <div className={styles.container}>
          <div className={styles.eruvGrid}>
            <div className={styles.eruvContent}>
              <p className={styles.eruvEyebrow}>Community Campaign</p>
              <h2 className={styles.eruvTitle}>Strengthen the Center City Eruv</h2>
              <p className={styles.eruvIntro}>
                Help us ensure this vital community resource remains reliable, durable, and halachically sound for generations to come.
              </p>
              <p className={styles.eruvOneLine}>
                Join Mekor Habracha in strengthening the Center City Eruv by{" "}
                <a
                  href="https://thechesedfund.com/centercityeruv/ep2026/teams/mekorhabracha"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  donating through our campaign team
                </a>
                , or{" "}
                <a
                  href="https://thechesedfund.com/centercityeruv/ep2026"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  read about the full campaign
                </a>
                .
              </p>
              <p className={styles.eruvGoal}>Goal: $75,000 | Mekor Habracha Team</p>
            </div>
            <div className={styles.eruvVisual}>
              <div className={styles.eruvImageWrapper}>
                <Image
                  src={ERUV_CAMPAIGN_IMAGE}
                  alt="Center City Eruv campaign"
                  width={1600}
                  height={1000}
                  sizes="(max-width: 960px) 100vw, 28rem"
                  className={styles.eruvImage}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.classPromoSection}>
        <div className={styles.container}>
          <div className={styles.classPromoGrid}>
            <div className={styles.classPromoContent}>
              <p className={styles.classEyebrow}>New This Summer</p>
              <h2 className={styles.classTitle}>New Class on Zionism and Democracy</h2>
              <p className={styles.classOneLine}>
                Join Rabbi Gotlib Tuesdays at 7pm starting July 14 for a new class on Zionism and Democracy. You can{" "}
                <a
                  href="https://forms.gle/aDkUYeBj3qvudcMD9"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  RSVP for the class
                </a>
                {" "}
                or{" "}
                <Link href="/newsletters/new-class-on-zionism-and-democracy-2026-07-05">
                  read the full announcement
                </Link>
                .
              </p>
            </div>
            <div className={styles.classVisual}>
              <div className={styles.classQuote}>
                <p>
                  A deep exploration of how Torah values intersect with modern democratic ideals — led by Rabbi Gotlib.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.featureSection}>
        <div className={styles.container}>
          <div className={styles.featureGrid}>
            <article className={styles.daveningCard}>
              <div className={styles.daveningVisual}>
                <Image
                  src={DAVEING_IMAGE}
                  alt="Prayer service at Mekor"
                  fill
                  sizes="(max-width: 900px) 100vw, 31rem"
                  className={styles.daveningImage}
                />
              </div>
              <div className={styles.daveningCopy}>
                <h2>Davening</h2>
                <p>Shabbat and Weekday services schedule</p>
                <p>
                  See our <Link href="/davening">complete Shabbat and weekday davening schedules</Link>, including daily
                  minyanim and classes.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.newsletterSection}>
        <div className={styles.container}>
          <div className={styles.newsletterPanel}>
            <h2>SUBSCRIBE TO OUR WEEKLY NEWSLETTER</h2>
            <HomeNewsletterForm
              sourcePath="/"
              className={styles.newsletterForm}
              inputClassName={styles.newsletterInput}
              submitClassName={styles.newsletterSubmit}
              successClassName={styles.newsletterMessage}
              errorClassName={styles.newsletterError}
            />
            <Link href="/newsletters" className={styles.newsletterArchive}>
              Past Newsletters
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.eventsSection}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Don&apos;t miss our upcoming events:</h2>
          <Suspense fallback={<UpcomingEventsList events={[]} loading />}>
            <HomeUpcomingEvents />
          </Suspense>
        </div>
      </section>

      <section className={styles.rabbisSection}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Our Rabbis</h2>
          <div className={styles.rabbisGrid}>
            {RABBIS.map((rabbi) => (
              <article key={rabbi.name} className={styles.rabbiCard}>
                <div className={styles.rabbiImageWrap}>
                  <Image src={rabbi.image} alt={rabbi.alt} fill sizes="(max-width: 900px) 100vw, 22rem" className={styles.rabbiImage} />
                </div>
                <div className={styles.rabbiBody}>
                  <p className={styles.rabbiRole}>{rabbi.role}</p>
                  <h3>
                    <Link href={rabbi.profileHref}>{rabbi.name}</Link>
                  </h3>
                  <p className={styles.rabbiBio}>{rabbi.bio}</p>
                  <div className={styles.rabbiLinks}>
                    {rabbi.links.map((link) => (
                      <BrandedLink key={link.label} {...link} compact />
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.contactSection}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Get in Touch</h2>
          <div className={styles.contactGrid}>
            <div className={styles.contactFormWrap}>
              <HomeContactForm
                sourcePath="/"
                className={styles.contactForm}
                fieldClassName={styles.contactField}
                inputClassName={styles.contactInput}
                textareaClassName={styles.contactTextarea}
                submitClassName={styles.contactSubmit}
                successClassName={styles.contactMessage}
                errorClassName={styles.contactError}
              />
            </div>
            <div className={styles.contactAside}>
              <div className={styles.contactMapShell}>
                {process.env.NODE_ENV === "production" ? (
                  <iframe
                    src={MAP_EMBED_SRC}
                    title="Mekor Habracha location map"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className={styles.contactMapFrame}
                  />
                ) : (
                  <div className={styles.contactMapFrame} aria-hidden />
                )}
              </div>
              <div className={styles.contactInfo}>
                <h3>Mekor Habracha</h3>
                <p>Center City Synagogue</p>
                <a href="tel:+12155254246">(215) 525-4246</a>
                <a href="mailto:admin@mekorhabracha.org?subject=Join%20Us">admin@mekorhabracha.org</a>
                <p>1500 Walnut St Suite 206</p>
                <p>Philadelphia, PA 19102</p>
                <a
                  href="https://maps.google.com/?q=1500+Walnut+St+Suite+206+Philadelphia+PA+19102"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Open in Google Maps
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerInner}>
            <div className={styles.footerContact}>
              <h2>Mekor Habracha</h2>
              <p className={styles.footerTagline}>Center City Synagogue</p>
              <div className={styles.footerRule} aria-hidden="true" />
              <a href="tel:+12155254246">(215) 525-4246</a>
              <a href="mailto:admin@mekorhabracha.org?subject=Join%20Us">admin@mekorhabracha.org</a>
              <p>1500 Walnut St Suite 206</p>
              <p>Philadelphia, PA 19102</p>
              <div className={styles.socialLinks}>
                {SOCIAL_LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={link.label}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
                      <path d={link.iconPath} />
                    </svg>
                  </a>
                ))}
              </div>
            </div>

            <div className={styles.footerNewsletter}>
              <h3>SUBSCRIBE TO OUR WEEKLY NEWSLETTER</h3>
              <HomeNewsletterForm
                sourcePath="/"
                className={styles.footerNewsletterForm}
                inputClassName={styles.footerNewsletterInput}
                submitClassName={styles.footerNewsletterSubmit}
                successClassName={styles.footerMessage}
                errorClassName={styles.footerError}
              />
              <Link href="/newsletters" className={styles.footerArchive}>
                Past Newsletters
              </Link>
            </div>
          </div>

          <div className={styles.footerMeta}>
            <p className={styles.copyright}>Copyright ©<CurrentCivilYear /> by Mekor Habracha Synagogue</p>
            <HebrewDateFooter
              className={styles.hebrewDate}
              labelClassName={styles.hebrewDateLabel}
              valueClassName={styles.hebrewDateValue}
            />
          </div>
        </div>
      </footer>
    </main>
  );
}
