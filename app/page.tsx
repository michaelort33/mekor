import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { HomeContactForm } from "@/components/home/home-contact-form";
import { HomeNewsletterForm } from "@/components/home/home-newsletter-form";
import { SiteNavigation } from "@/components/navigation/site-navigation";
import { getManagedEvents } from "@/lib/events/store";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import styles from "@/app/page.module.css";

export const dynamic = "force-dynamic";

const HERO_IMAGE = "https://static.wixstatic.com/media/11062b_8135b27108d04d2a97adc750a341fb79~mv2.jpeg";
const DAVEING_IMAGE = "https://static.wixstatic.com/media/92f487_34e64b1fb2e94c56886578290ef2bcd0~mv2.jpeg";
const FOOTER_BANNER = "https://static.wixstatic.com/media/92f487_22b1dca93b6045ad8ed3ce85337f5c74~mv2.jpg";
const DEFAULT_EVENT_IMAGE = "https://static.wixstatic.com/media/92f487_518da3eb34cf4128806d9b17c5933881~mv2.jpg";

const SUPPORT_LINKS = [
  {
    label: "Wine: tinyurl.com/mekorwine",
    href: "https://tinyurl.com/mekorwine",
  },
  {
    label: "Judaica: tinyurl.com/mekorjudaica",
    href: "https://tinyurl.com/mekorjudaica",
  },
] as const;

const RABBIS = [
  {
    name: "Rabbi Eliezer Hirsch",
    image:
      "https://static.wixstatic.com/media/92f487_e03dc964305644a9b5eb3894502ed630~mv2.jpg/v1/crop/x_0,y_0,w_799,h_663/fill/w_799,h_662,al_c,q_85,enc_avif,quality_auto/92f487_d26f360d09cc45e4bebe89d9f14643d3~mv2 copy2 (Medium).jpg",
    alt: "Rabbi Eliezer Hirsch",
    links: [
      { label: "Podcast", href: "https://rabbiehirsch.castos.com/" },
      { label: "Substack", href: "https://rabbieliezerhirsch.substack.com/" },
      { label: "Books", href: "https://www.amazon.com/Rabbi-Eliezer-Hirsch/e/B0876V66RG%3Fref=dbs_a_mng_rwt_scns_share" },
      { label: "Read more", href: "/our-rabbi" },
    ],
  },
  {
    name: "Rabbi Steven Gotlib",
    image:
      "https://static.wixstatic.com/media/66bc7c_7ded87b518b94c619c3f89f470cb4a9d~mv2.jpg/v1/crop/x_0,y_0,w_763,h_632/fill/w_763,h_632,al_c,q_85,enc_avif,quality_auto/R Gotlib.jpg",
    alt: "Rabbi Steven Gotlib",
    links: [
      { label: "Facebook", href: "https://www.facebook.com/StevenJGotlib/" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/steven-j-gotlib/" },
      { label: "Read more", href: "/our-rabbi" },
    ],
  },
] as const;

const SOCIAL_LINKS = [
  { label: "Instagram", href: "https://www.instagram.com/mekorhabracha/" },
  { label: "YouTube", href: "https://www.youtube.com/channel/UCfj7vuvPA80HMVN-09ZxOHA" },
  {
    label: "Facebook",
    href: "https://www.facebook.com/groups/19458667730/?hoisted_section_header_type=recently_seen&multi_permalinks=10160757013487731",
  },
] as const;

function formatHomeEventDate(value: string | null, shortDate: string) {
  if (!value) {
    return shortDate;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return shortDate;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath("/");
  return buildDocumentMetadata(document);
}

export default async function HomePage() {
  const upcomingManagedEvents = (await getManagedEvents()).filter((event) => !event.isPast);
  const featuredEvent = upcomingManagedEvents[0] ?? null;
  const upcomingEvent = upcomingManagedEvents[1] ?? featuredEvent;

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
                Mekor Habracha / Center City Synagogue is a vibrant, inclusive Modern Orthodox community located in
                the heart of Center City, Philadelphia.
              </p>
              <p>
                We offer a wide range of religious, educational, and social opportunities for a diverse and growing
                membership. Visitors, whether from across the street or across the world, are always warmly welcomed.
              </p>
              <p>
                Our rabbis, Rabbi Hirsch and Rabbi Gotlib, are always happy to connect. You can reach them{" "}
                <Link href="/our-rabbi">here.</Link>
              </p>
              <Link href="/about-us" className={styles.aboutButton}>
                Read more
              </Link>
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

      <section className={styles.featureSection}>
        <div className={styles.container}>
          <div className={styles.featureGrid}>
            <article className={styles.featureCard}>
              <div className={styles.featureCopy}>
                <h2>{featuredEvent?.title ?? "Purim at Mekor"}</h2>
                <p>
                  {featuredEvent?.timeLabel ||
                    featuredEvent?.shortDate ||
                    "Join us for Megillah readings, tefillot, and our festive Purim celebration."}
                </p>
                <div className={styles.supportCopy}>
                  <h3>Support Mekor while buying wine and Judaica!</h3>
                  <p>
                    If you use the following Mekor-specific links when ordering from Kosherwine.com and Judaica.com,
                    Mekor will earn 5% back!
                  </p>
                  <div className={styles.supportLinks}>
                    {SUPPORT_LINKS.map((link) => (
                      <a key={link.href} href={link.href} target="_blank" rel="noreferrer noopener">
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
                <Link href={featuredEvent?.path ?? "/events"} className={styles.featureButton}>
                  Event Details
                </Link>
              </div>

              <div className={styles.featureVisual}>
                <Image
                  src={featuredEvent?.heroImage || DEFAULT_EVENT_IMAGE}
                  alt={featuredEvent ? `${featuredEvent.title} graphic` : "Featured Mekor event"}
                  fill
                  sizes="(max-width: 900px) 100vw, 31rem"
                  className={styles.featureImage}
                />
              </div>
            </article>

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
                  Click below for our complete Shabbat and weekday davening schedules, including daily minyanim and
                  classes.
                </p>
                <Link href="/davening" className={styles.daveningButton}>
                  Learn More
                </Link>
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
            <a
              href="https://us2.campaign-archive.com/home/?u=f9fe87a16c42c24704c099073&id=94f3350887"
              target="_blank"
              rel="noreferrer noopener"
              className={styles.newsletterArchive}
            >
              Latest Newsletters
            </a>
          </div>
        </div>
      </section>

      <section className={styles.eventsSection}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Don&apos;t miss our upcoming events:</h2>
          <div className={styles.upcomingCard}>
            <div className={styles.upcomingImageWrap}>
              <Image
                src={upcomingEvent?.heroImage || DEFAULT_EVENT_IMAGE}
                alt={upcomingEvent ? `${upcomingEvent.title} graphic` : "Upcoming event graphic"}
                fill
                sizes="(max-width: 900px) 100vw, 24rem"
                className={styles.upcomingImage}
              />
            </div>
            <div className={styles.upcomingCopy}>
              <Link href={upcomingEvent?.path ?? "/events"} className={styles.upcomingTitle}>
                {upcomingEvent?.title ?? "Mekor’s Tot Shabbat"}
              </Link>
              <p>{upcomingEvent ? formatHomeEventDate(upcomingEvent.startAt, upcomingEvent.shortDate) : "Once a month"}</p>
              <p>{upcomingEvent?.location || "Philadelphia"}</p>
              <div className={styles.upcomingActions}>
                <Link href={upcomingEvent?.path ?? "/events"}>More info</Link>
                <Link href={upcomingEvent?.path ?? "/events"}>RSVP</Link>
              </div>
            </div>
          </div>
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
                  <h3>{rabbi.name}</h3>
                  <div className={styles.rabbiLinks}>
                    {rabbi.links.map((link) =>
                      link.href.startsWith("/") ? (
                        <Link key={link.label} href={link.href}>
                          {link.label}
                        </Link>
                      ) : (
                        <a key={link.label} href={link.href} target="_blank" rel="noreferrer noopener">
                          {link.label}
                        </a>
                      ),
                    )}
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
            <div className={styles.contactInfo}>
              <h3>Mekor Habracha</h3>
              <p>Center City Synagogue</p>
              <a href="tel:+12155254246">(215) 525-4246</a>
              <a href="mailto:admin@mekorhabracha.org?subject=Join%20Us">admin@mekorhabracha.org</a>
              <p>1500 Walnut St Suite 206</p>
              <p>Philadelphia, PA 19102</p>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBanner}>
          <Image src={FOOTER_BANNER} alt="" fill sizes="100vw" className={styles.footerBannerImage} />
          <div className={styles.footerBannerOverlay} />
        </div>
        <div className={styles.container}>
          <div className={styles.footerInner}>
            <div className={styles.footerContact}>
              <h2>Mekor Habracha</h2>
              <p>Center City Synagogue</p>
              <a href="tel:+12155254246">(215) 525-4246</a>
              <a href="mailto:admin@mekorhabracha.org?subject=Join%20Us">admin@mekorhabracha.org</a>
              <p>1500 Walnut St Suite 206</p>
              <p>Philadelphia, PA 19102</p>
              <div className={styles.socialLinks}>
                {SOCIAL_LINKS.map((link) => (
                  <a key={link.label} href={link.href} target="_blank" rel="noreferrer noopener">
                    {link.label}
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
              <a
                href="https://us2.campaign-archive.com/home/?u=f9fe87a16c42c24704c099073&id=94f3350887"
                target="_blank"
                rel="noreferrer noopener"
                className={styles.footerArchive}
              >
                Latest Newsletters
              </a>
            </div>
          </div>

          <p className={styles.copyright}>Copyright ©2025 by Mekor Habracha Synagogue</p>
        </div>
      </footer>
    </main>
  );
}
