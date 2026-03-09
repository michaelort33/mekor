import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import { HeroSection, SectionCard, SplitMediaText } from "@/components/marketing/primitives";
import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { getManagedEvents } from "@/lib/events/store";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import styles from "@/app/page.module.css";

export const dynamic = "force-dynamic";

const HOME_SIGNALS = [
  {
    eyebrow: "Welcome",
    title: "A Welcoming Community",
    text: "Mekor Habracha / Center City Synagogue is a vibrant, inclusive Modern Orthodox community located in the heart of Center City, Philadelphia.",
  },
  {
    eyebrow: "Visitors",
    title: "Across the street or across the world",
    text: "We offer a wide range of religious, educational, and social opportunities for a diverse and growing membership. Visitors are always warmly welcomed.",
  },
  {
    eyebrow: "Connect",
    title: "Rabbi Hirsch and Rabbi Gotlib",
    text: "Our rabbis, Rabbi Hirsch and Rabbi Gotlib, are always happy to connect.",
  },
] as const;

const RABBI_PROFILES = [
  {
    role: "Senior Rabbi",
    name: "Rabbi Eliezer Hirsch",
    bio: "Rabbi Eliezer Hirsch is Mekor Habracha's founding rabbi and spiritual leader, shaping the voice and direction of the community from its earliest years.",
    image: "https://static.wixstatic.com/media/92f487_e03dc964305644a9b5eb3894502ed630~mv2.jpg",
    alt: "Rabbi Eliezer Hirsch",
    links: [
      { label: "Podcast", href: "https://rabbiehirsch.castos.com/" },
      { label: "Substack", href: "https://rabbieliezerhirsch.substack.com/" },
      { label: "Books", href: "https://www.amazon.com/Rabbi-Eliezer-Hirsch/e/B0876V66RG%3Fref=dbs_a_mng_rwt_scns_share" },
      { label: "Full profile", href: "/our-rabbi#rabbi-eliezer-hirsch" },
    ],
  },
  {
    role: "Associate Rabbi",
    name: "Rabbi Steven Gotlib",
    bio: "Rabbi Steven Gotlib brings scholarship, accessibility, and energy to Mekor as Associate Rabbi and Director of the Center City Beit Midrash.",
    image: "https://static.wixstatic.com/media/66bc7c_7ded87b518b94c619c3f89f470cb4a9d~mv2.jpg",
    alt: "Rabbi Steven Gotlib",
    links: [
      { label: "Facebook", href: "https://www.facebook.com/StevenJGotlib/" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/steven-j-gotlib/" },
      { label: "Full profile", href: "/our-rabbi#rabbi-steven-gotlib" },
    ],
  },
] as const;

const SUPPORT_LINKS = [
  {
    title: "Shop wine",
    note: "Use Mekor's Kosherwine.com link and the shul receives 5% back.",
    href: "https://tinyurl.com/mekorwine",
  },
  {
    title: "Shop Judaica",
    note: "Order gifts and ritual items through Mekor's Judaica.com link.",
    href: "https://tinyurl.com/mekorjudaica",
  },
] as const;

const INTRO_VIDEO_URL = "https://www.youtube.com/embed/aieR-a2z1RY";

function formatHomeEventDate(value: string | null, shortDate: string) {
  if (!value) {
    return shortDate;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return shortDate;
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath("/");
  return buildDocumentMetadata(document);
}

export default async function HomePage() {
  const upcomingEvents = (await getManagedEvents())
    .filter((event) => !event.isPast)
    .slice(0, 2)
    .map((event) => ({
      image: event.heroImage,
      alt: `${event.title} event graphic`,
      title: event.title,
      date: formatHomeEventDate(event.startAt, event.shortDate),
      place: event.location || "Philadelphia",
      href: event.path,
    }));

  return (
    <MarketingPageShell currentPath="/" className={styles.page} contentClassName={styles.stack}>
      <HeroSection
        eyebrow="Welcome to"
        title="Mekor Habracha"
        subtitle="Center City Synagogue"
        variant="quiet"
        image={{
          src: "https://static.wixstatic.com/media/11062b_8135b27108d04d2a97adc750a341fb79~mv2.jpeg",
          alt: "Mekor Habracha community gathering",
          objectFit: "cover",
          objectPosition: "center center",
        }}
        tone="dark"
        actions={[
          { label: "Join Us", href: "https://chat.whatsapp.com/G7JTiUN3aPN1V09lbBLC7G" },
          { label: "Events", href: "/events" },
          { label: "Davening", href: "/davening" },
        ]}
        className={styles.hero}
      />

      <section className={styles.signalGrid} aria-label="Why Mekor">
        {HOME_SIGNALS.map((signal) => (
          <article key={signal.title} className={styles.signalCard}>
            <p className={styles.signalEyebrow}>{signal.eyebrow}</p>
            <h2 className={styles.signalTitle}>{signal.title}</h2>
            <p className={styles.signalText}>{signal.text}</p>
          </article>
        ))}
      </section>

      <SectionCard className={styles.introCard}>
        <div className={styles.introGrid}>
          <div className={styles.introCopy}>
            <p className={styles.sectionEyebrow}>About Mekor</p>
            <h2 className={styles.introTitle}>A Welcoming Community</h2>
            <p className={styles.introText}>
              Mekor Habracha / Center City Synagogue is a vibrant, inclusive Modern Orthodox community located in the heart of Center City, Philadelphia.
            </p>
            <p className={styles.introText}>
              We offer a wide range of religious, educational, and social opportunities for a diverse and growing membership. Visitors, whether from across the street or across the world, are always warmly welcomed.
            </p>
            <p className={styles.introText}>
              Our rabbis, Rabbi Hirsch and Rabbi Gotlib, are always happy to connect. You can reach them <Link href="/our-rabbi">here</Link>.
            </p>
            <div className={styles.inlineLinks}>
              <Link href="/about-us">Read more about Mekor</Link>
              <Link href="/our-rabbi">Meet our rabbis</Link>
            </div>
          </div>
          <div className={styles.introMedia}>
            <div className={styles.introVideo}>
              <iframe
                src={INTRO_VIDEO_URL}
                title="Mekor Habracha - Center City Synagogue"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <div className={styles.featureGrid}>
        <SectionCard className={styles.featureCard}>
          <SplitMediaText
            title="Purim at Mekor"
            kicker="Featured Event"
            className={styles.featureStory}
            media={{
              src: "https://static.wixstatic.com/media/92f487_518da3eb34cf4128806d9b17c5933881~mv2.jpg",
              alt: "Purim community celebration",
            }}
            paragraphs={[
              "Join us for Megillah readings, tefillot, and our festive Purim celebration.",
            ]}
            links={[
              { label: "Event Details", href: "/events-1/purim-at-mekor" },
            ]}
          />
        </SectionCard>

        <SectionCard className={styles.featureCard}>
          <SplitMediaText
            title="Davening"
            kicker="Shabbat and Weekday Services"
            className={styles.featureStory}
            media={{
              src: "https://static.wixstatic.com/media/92f487_34e64b1fb2e94c56886578290ef2bcd0~mv2.jpeg",
              alt: "Prayer service at Mekor",
            }}
            paragraphs={[
              "Click below for our complete Shabbat and weekday davening schedules, including daily minyanim and classes.",
            ]}
            links={[{ label: "Learn More", href: "/davening" }]}
          />
        </SectionCard>
      </div>

      <SectionCard className={styles.supportCard}>
        <div className={styles.supportContent}>
          <div className={styles.supportTextBlock}>
            <h2 className={styles.supportTitle}>Support Mekor while buying wine and Judaica!</h2>
            <p className={styles.supportText}>
              Use the Mekor-specific links below when ordering from Kosherwine.com and Judaica.com, and Mekor will earn <strong>5% back</strong> on every purchase.
            </p>
          </div>
          <div className={styles.supportButtons}>
            {SUPPORT_LINKS.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noreferrer noopener" className={styles.supportButton}>
                <span className={styles.supportButtonLabel}>{link.title}</span>
                <span className={styles.supportButtonNote}>{link.note}</span>
              </a>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard className={styles.eventsCard}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Upcoming</p>
            <h2 className={styles.sectionTitle}>Don&apos;t miss our upcoming events:</h2>
          </div>
          <Link href="/events" className={styles.textLink}>See all events</Link>
        </div>
        <div className={styles.eventsGrid}>
          {upcomingEvents.map((event) => (
            <article key={event.href} className={styles.eventCard}>
              <div className={styles.eventMedia}>
                <Image src={event.image} alt={event.alt} width={960} height={720} sizes="(max-width: 900px) 100vw, 33vw" />
              </div>
              <div className={styles.eventBody}>
                <p className={styles.eventDate}>{event.date}</p>
                <h3>{event.title}</h3>
                <p className={styles.eventPlace}>{event.place}</p>
                <Link className={styles.eventLink} href={event.href}>
                  RSVP
                </Link>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard className={styles.rabbisCard}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Leadership</p>
            <h2 className={styles.sectionTitle}>Our Rabbis</h2>
          </div>
          <Link href="/our-rabbi" className={styles.textLink}>Meet our rabbis</Link>
        </div>
        <div className={styles.rabbisGrid}>
          {RABBI_PROFILES.map((rabbi) => (
            <article key={rabbi.name} className={styles.rabbiCard}>
              <div className={styles.rabbiPortrait}>
                <Image src={rabbi.image} alt={rabbi.alt} width={960} height={1200} sizes="(max-width: 900px) 100vw, 28vw" />
              </div>
              <div className={styles.rabbiBody}>
                <p className={styles.rabbiRole}>{rabbi.role}</p>
                <h3>{rabbi.name}</h3>
                <p>{rabbi.bio}</p>
                <div className={styles.inlineLinks}>
                  {rabbi.links.map((link) =>
                    link.href.startsWith("/") ? (
                      <Link key={link.href} href={link.href}>
                        {link.label}
                      </Link>
                    ) : (
                      <a key={link.href} href={link.href} target="_blank" rel="noreferrer noopener">
                        {link.label}
                      </a>
                    ),
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard className={styles.contactCard}>
        <div className={styles.contactGrid}>
          <div>
            <p className={styles.sectionEyebrow}>Contact</p>
            <h2 className={styles.sectionTitle}>Get in Touch</h2>
            <p className={styles.contactText}>
              We&apos;d love to hear from you. Reach out by phone or email, or visit Mekor at 1500 Walnut St Suite 206 in Center City Philadelphia.
            </p>
          </div>
          <div className={styles.contactPanel}>
            <a href="tel:+12155254246">(215) 525-4246</a>
            <a href="mailto:admin@mekorhabracha.org?subject=Join%20Us">admin@mekorhabracha.org</a>
            <p>1500 Walnut St Suite 206, Philadelphia, PA 19102</p>
          </div>
        </div>
      </SectionCard>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
