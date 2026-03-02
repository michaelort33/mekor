import type { Metadata } from "next";
import Link from "next/link";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { CTACluster, HeroSection, SectionCard, SplitMediaText } from "@/components/marketing/primitives";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import styles from "@/app/page.module.css";

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath("/");
  return buildDocumentMetadata(document);
}

export default function HomePage() {
  return (
    <MarketingPageShell currentPath="/" className={styles.page} contentClassName={styles.stack}>
      <HeroSection
        eyebrow="Welcome to"
        title="Mekor Habracha"
        subtitle="Center City Synagogue"
        image={{
          src: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/c65062f0988a1d51a856aa9c037d2020c40df820-11062b_8135b27108d04d2a97adc750a341fb79-mv2.jpeg",
          alt: "Mekor Habracha community gathering",
        }}
        actions={[
          { label: "Join Us", href: "https://chat.whatsapp.com/G7JTiUN3aPN1V09lbBLC7G" },
          { label: "Events", href: "/events" },
          { label: "Davening", href: "/davening" },
        ]}
      />

      <SectionCard>
        <div className={styles.welcome}>
          <h2 className={styles.welcomeTitle}>A Welcoming Community</h2>
          <p className={styles.welcomeText}>
            Mekor Habracha / Center City Synagogue is a vibrant, inclusive Modern Orthodox community
            located in the heart of Center City, Philadelphia.
          </p>
          <p className={styles.welcomeText}>
            We offer a wide range of religious, educational, and social opportunities for a diverse and
            growing membership. Visitors, whether from across the street or across the world, are always
            warmly welcomed.
          </p>
          <p className={styles.welcomeText}>
            Our rabbis, Rabbi Hirsch and Rabbi Gotlib, are always happy to connect.
          </p>
          <CTACluster
            title="Learn More"
            items={[
              { label: "Read more about Mekor", href: "/about-us" },
              { label: "Meet our rabbis", href: "/our-rabbi" },
            ]}
          />
        </div>
      </SectionCard>

      <div className={styles.featureGrid}>
        <SectionCard>
          <SplitMediaText
            title="Purim at Mekor"
            kicker="Featured Event"
            media={{
              src: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/6eb19189fdda0e39881aecd97fc9c7117898ee43-92f487_518da3eb34cf4128806d9b17c5933881-mv2.jpg",
              alt: "Purim community celebration",
            }}
            paragraphs={[
              "Join us for Megillah readings, tefillot, and our festive Purim celebration.",
              "Support Mekor while buying wine and Judaica. If you use the links below when ordering, Mekor earns 5% back.",
            ]}
            links={[
              { label: "Event Details", href: "/events-1/purim-at-mekor" },
              { label: "Kosherwine.com", href: "http://kosherwine.com/" },
              { label: "Judaica.com", href: "http://judaica.com/" },
              { label: "Wine: tinyurl.com/mekorwine", href: "https://tinyurl.com/mekorwine" },
              { label: "Judaica: tinyurl.com/mekorjudaica", href: "https://tinyurl.com/mekorjudaica" },
            ]}
          />
        </SectionCard>

        <SectionCard>
          <SplitMediaText
            title="Davening"
            kicker="Shabbat and Weekday Services"
            media={{
              src: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/dcdd623c1d8f5897af1126ed3ddfe29953c50a4a-92f487_34e64b1fb2e94c56886578290ef2bcd0-mv2.jpeg",
              alt: "Prayer service at Mekor",
            }}
            paragraphs={[
              "Click below for our complete Shabbat and weekday davening schedules, including daily minyanim and classes.",
            ]}
            links={[{ label: "Learn More", href: "/davening" }]}
          />
        </SectionCard>
      </div>

      <SectionCard title="Don't miss our upcoming events:">
        <div className={styles.eventsGrid}>
          <article className={styles.eventCard}>
            <img
              src="https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/8134dcaa3b3b0d7bc61eb1e91ba63127094eb8ad-92f487_518da3eb34cf4128806d9b17c5933881-mv2.jpg"
              alt="Purim at Mekor event poster"
            />
            <div className={styles.eventCardBody}>
              <h3>Purim at Mekor</h3>
              <p className={styles.eventMeta}>Mon, Mar 02 • 1500 Walnut St #206, Philadelphia, PA</p>
              <Link className={styles.eventLink} href="/events-1/purim-at-mekor">
                RSVP
              </Link>
            </div>
          </article>
          <article className={styles.eventCard}>
            <img
              src="https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/472ee2bb31a07e33d2f1dc87b406b658971c6140-92f487_a7ee1919f498484d90fb90f912123602-mv2.png"
              alt="Mekor Tot Shabbat event"
            />
            <div className={styles.eventCardBody}>
              <h3>Mekor&apos;s Tot Shabbat</h3>
              <p className={styles.eventMeta}>Once a month • Philadelphia</p>
              <Link className={styles.eventLink} href="/events-1/mekors-tot-shabbat">
                RSVP
              </Link>
            </div>
          </article>
        </div>
      </SectionCard>

      <SectionCard title="Our Rabbis">
        <div className={styles.rabbisGrid}>
          <article className={styles.rabbiCard}>
            <img
              src="https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/18252d53ced06155ea40feb7616bedf8ddc84949-92f487_d26f360d09cc45e4bebe89d9f14643d3-mv2-20copy2-20-medium-.jpg"
              alt="Rabbi Eliezer Hirsch"
            />
            <div className={styles.rabbiCardBody}>
              <p className={styles.rabbiRole}>Senior Rabbi</p>
              <h3>Rabbi Eliezer Hirsch</h3>
              <p>
                Rabbi Eliezer Hirsch is Mekor Habracha&apos;s spiritual leader and founding rabbi, guiding the
                congregation since its earliest years.
              </p>
              <div className={styles.rabbiLinks}>
                <a href="https://rabbiehirsch.castos.com/">Podcast</a>
                <a href="https://rabbieliezerhirsch.substack.com/">Substack</a>
                <a href="https://www.amazon.com/Rabbi-Eliezer-Hirsch/e/B0876V66RG%3Fref=dbs_a_mng_rwt_scns_share">
                  Books
                </a>
              </div>
            </div>
          </article>
          <article className={styles.rabbiCard}>
            <img
              src="https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/8f415a349a311e5c78b0eed19734d55541d8d0f6-r-20gotlib.jpg"
              alt="Rabbi Steven Gotlib"
            />
            <div className={styles.rabbiCardBody}>
              <p className={styles.rabbiRole}>Associate Rabbi</p>
              <h3>Rabbi Steven Gotlib</h3>
              <p>
                Rabbi Steven Gotlib serves as Associate Rabbi and Director of the Center City Beit Midrash,
                bringing scholarship and warmth to the community.
              </p>
              <div className={styles.rabbiLinks}>
                <a href="https://www.facebook.com/StevenJGotlib/">Facebook</a>
                <a href="https://www.linkedin.com/in/steven-j-gotlib/">LinkedIn</a>
                <Link href="/our-rabbi">Read more</Link>
              </div>
            </div>
          </article>
        </div>
      </SectionCard>

      <SectionCard title="Get in Touch">
        <div className={styles.touchGrid}>
          <p className={styles.touchText}>
            We&apos;d love to hear from you. Reach out by phone or email, or visit Mekor at 1500 Walnut St
            Suite 206 in Center City Philadelphia.
          </p>
          <div className={styles.touchPanel}>
            <h3>Contact</h3>
            <a href="tel:+12155254246">(215) 525-4246</a>
            <a href="mailto:admin@mekorhabracha.org?subject=Join%20Us">admin@mekorhabracha.org</a>
          </div>
        </div>
      </SectionCard>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
