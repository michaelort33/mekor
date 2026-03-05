import type { Metadata } from "next";
import Link from "next/link";

import { HeroSection, SectionCard } from "@/components/marketing/primitives";
import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import styles from "@/app/page.module.css";

export const dynamic = "force-static";

const HOME_SIGNALS = [
  {
    eyebrow: "City-centered",
    title: "1500 Walnut Street",
    text: "A modern Orthodox home base in the middle of Center City Philadelphia.",
  },
  {
    eyebrow: "Consistent rhythm",
    title: "Shabbat and weekday minyanim",
    text: "A steady schedule of tefillah, Torah, and community touchpoints throughout the week.",
  },
  {
    eyebrow: "Open door",
    title: "Visitors are truly welcome",
    text: "Whether you are new in town or here for the weekend, Mekor is built for easy entry.",
  },
] as const;

const COMMUNITY_PILLARS = [
  {
    title: "Daven",
    description: "Join a serious, warm davening environment with a Center City crowd that shows up for each other.",
    href: "/davening",
    label: "View davening times",
  },
  {
    title: "Learn",
    description: "Classes, shiurim, podcasts, and Beit Midrash programming make Torah learning part of everyday life here.",
    href: "/our-rabbi",
    label: "Meet our rabbis",
  },
  {
    title: "Belong",
    description: "Shabbat meals, young-family life, holiday programming, and an active social fabric keep the room full.",
    href: "/membership",
    label: "Explore membership",
  },
] as const;

const WEEKLY_RHYTHM = [
  {
    label: "Shabbat",
    text: "Davening, kiddush, meals, and the kind of post-shul lingering that turns visitors into regulars.",
  },
  {
    label: "Weekdays",
    text: "Daily minyanim, classes, and easy drop-ins before work, after work, or on your lunch break.",
  },
  {
    label: "Holidays",
    text: "Mekor is at its best when the calendar gets full: singing, learning, shared tables, and full rooms.",
  },
] as const;

const UPCOMING_EVENTS = [
  {
    title: "Purim at Mekor",
    date: "Mon, Mar 02",
    place: "1500 Walnut St #206, Philadelphia, PA",
    href: "/events-1/purim-at-mekor",
    image: "https://static.wixstatic.com/media/92f487_518da3eb34cf4128806d9b17c5933881~mv2.jpg",
    alt: "Purim at Mekor event poster",
  },
  {
    title: "Mekor's Tot Shabbat",
    date: "Monthly",
    place: "Philadelphia",
    href: "/events-1/mekors-tot-shabbat",
    image: "https://static.wixstatic.com/media/92f487_a7ee1919f498484d90fb90f912123602~mv2.png",
    alt: "Mekor Tot Shabbat event graphic",
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

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath("/");
  return buildDocumentMetadata(document);
}

export default function HomePage() {
  return (
    <MarketingPageShell currentPath="/" className={styles.page} contentClassName={styles.stack}>
      <HeroSection
        eyebrow="Center City Philadelphia"
        title="A serious, warm, and unmistakably local shul."
        subtitle="Mekor Habracha"
        description={[
          "Daven with us, learn with us, or just walk in for Shabbat and introduce yourself.",
          "Mekor brings together young professionals, families, longtime Philadelphians, and out-of-town visitors in one room.",
        ]}
        image={{
          src: "https://static.wixstatic.com/media/11062b_8135b27108d04d2a97adc750a341fb79~mv2.jpeg",
          alt: "Mekor Habracha community gathering",
          objectFit: "cover",
          objectPosition: "center center",
        }}
        tone="dark"
        actions={[
          { label: "Plan a Visit", href: "/visit-us" },
          { label: "Upcoming Events", href: "/events" },
          { label: "Join the WhatsApp", href: "https://chat.whatsapp.com/G7JTiUN3aPN1V09lbBLC7G" },
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
          <div className={styles.introStatement}>
            <p className={styles.sectionEyebrow}>What makes Mekor different</p>
            <h2>
              Big-city Jewish life should feel immediate, thoughtful, and human.
            </h2>
          </div>
          <div className={styles.introBody}>
            <p>
              Mekor Habracha / Center City Synagogue is a vibrant, inclusive modern Orthodox community in the heart of
              Philadelphia. People come for tefillah, Torah, meals, friendship, and the feeling that there is always
              another conversation waiting after davening.
            </p>
            <p>
              Whether you are looking for a weekly shul, a Shabbat anchor, or your first stop in town, Mekor is built
              to help you step in quickly and feel at home.
            </p>
            <div className={styles.inlineLinks}>
              <Link href="/about-us">About Mekor</Link>
              <Link href="/our-rabbi">Meet the rabbis</Link>
              <Link href="/membership">Membership options</Link>
            </div>
          </div>
        </div>
      </SectionCard>

      <section className={styles.pillarGrid} aria-label="Community pillars">
        {COMMUNITY_PILLARS.map((pillar) => (
          <SectionCard key={pillar.title} className={styles.pillarCard}>
            <p className={styles.sectionEyebrow}>{pillar.title}</p>
            <h2 className={styles.pillarTitle}>{pillar.title}</h2>
            <p className={styles.pillarText}>{pillar.description}</p>
            <Link href={pillar.href} className={styles.textLink}>
              {pillar.label}
            </Link>
          </SectionCard>
        ))}
      </section>

      <section className={styles.storyGrid}>
        <SectionCard tone="dark" className={styles.rhythmCard}>
          <p className={styles.sectionEyebrow}>The weekly rhythm</p>
          <h2 className={styles.rhythmTitle}>There is always a next entry point.</h2>
          <div className={styles.rhythmList}>
            {WEEKLY_RHYTHM.map((item) => (
              <article key={item.label} className={styles.rhythmItem}>
                <h3>{item.label}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard className={styles.visitCard}>
          <p className={styles.sectionEyebrow}>First time here?</p>
          <h2 className={styles.visitTitle}>Start with the essentials.</h2>
          <div className={styles.visitList}>
            <div>
              <span>Where</span>
              <strong>1500 Walnut St, Suite 206</strong>
            </div>
            <div>
              <span>Questions</span>
              <a href="mailto:admin@mekorhabracha.org?subject=Planning%20a%20visit">admin@mekorhabracha.org</a>
            </div>
            <div>
              <span>Need times?</span>
              <Link href="/davening">See the davening schedule</Link>
            </div>
          </div>
          <div className={styles.inlineLinks}>
            <Link href="/visit-us">Visitor information</Link>
            <Link href="/contact-us">Contact Mekor</Link>
          </div>
        </SectionCard>
      </section>

      <SectionCard tone="blue" className={styles.supportCard}>
        <div className={styles.supportHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Support the shul in ordinary life</p>
            <h2 className={styles.supportTitle}>Buy what you already need and send 5% back to Mekor.</h2>
          </div>
          <p className={styles.supportText}>
            Use Mekor&apos;s dedicated links when ordering wine or Judaica and the community benefits from every purchase.
          </p>
        </div>
        <div className={styles.supportGrid}>
          {SUPPORT_LINKS.map((link) => (
            <a key={link.href} href={link.href} target="_blank" rel="noreferrer noopener" className={styles.supportLink}>
              <span className={styles.supportLinkTitle}>{link.title}</span>
              <span className={styles.supportLinkNote}>{link.note}</span>
            </a>
          ))}
        </div>
      </SectionCard>

      <SectionCard className={styles.eventsCard}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>On the calendar</p>
            <h2 className={styles.sectionTitle}>Upcoming events</h2>
          </div>
          <Link href="/events" className={styles.textLink}>
            See all events
          </Link>
        </div>
        <div className={styles.eventsGrid}>
          {UPCOMING_EVENTS.map((event) => (
            <article key={event.href} className={styles.eventCard}>
              <div className={styles.eventMedia}>
                <img src={event.image} alt={event.alt} loading="lazy" decoding="async" />
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
            <h2 className={styles.sectionTitle}>The rabbis who shape Mekor</h2>
          </div>
          <Link href="/our-rabbi" className={styles.textLink}>
            Full rabbi page
          </Link>
        </div>
        <div className={styles.rabbisGrid}>
          {RABBI_PROFILES.map((rabbi) => (
            <article key={rabbi.name} className={styles.rabbiCard}>
              <div className={styles.rabbiPortrait}>
                <img src={rabbi.image} alt={rabbi.alt} loading="lazy" decoding="async" />
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
            <p className={styles.sectionEyebrow}>Reach out</p>
            <h2 className={styles.sectionTitle}>Questions before you come?</h2>
            <p className={styles.contactText}>
              Call, email, or stop by. Mekor is in the center of the city and easy to find if you&apos;re visiting for
              Shabbat, moving to the neighborhood, or just looking for a place to start.
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
