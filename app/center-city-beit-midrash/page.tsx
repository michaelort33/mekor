import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { CTACluster, HeroSection, SectionCard } from "@/components/marketing/primitives";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import styles from "./page.module.css";

const PATH = "/center-city-beit-midrash" as const;

const CCBM_IMAGES = {
  hero: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/ad9d76b19c126bc8aa73e96ddce52cf25a40d9a4-hero.jpeg",
  banner: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/c97981efef0b1c409230bd4f75216b9ce6e4fa47-banner.jpg",
} as const;

const SUMMER_CLASSES = [
  { name: "Talmud Brachot", day: "Tuesday", time: "7:00 PM" },
  { name: "Religious Zionism", day: "Wednesday", time: "7:00 PM" },
  { name: "Rupture & Reconstruction", day: "Thursday", time: "7:00 PM" },
  { name: "Midrash Rabbah", day: "Friday", time: "6:45 PM" },
] as const;

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath(PATH);
  return buildDocumentMetadata(document);
}

export default async function CenterCityBeitMidrashPage() {
  const document = await getNativeDocumentByPath(PATH);

  if (!document) {
    notFound();
  }

  return (
    <MarketingPageShell currentPath={PATH} className={styles.page} contentClassName={styles.stack}>
      <HeroSection
        eyebrow="Learning"
        title="The Center City Beit Midrash (CCBM)"
        subtitle="Summer Classes at Mekor!"
        className={styles.heroSection}
        image={{
          src: CCBM_IMAGES.hero,
          alt: "Center City Beit Midrash learning session",
          objectFit: "cover",
          objectPosition: "50% 30%",
        }}
        description={[
          "Daily Amud Yomi Shiur - With Cereal!",
          "Upcoming (CCBM) Events",
        ]}
        actions={[
          { label: "Email for Class Details", href: "mailto:admin@mekorhabracha.org?subject=CCBM%20Classes" },
          { label: "View Upcoming Events", href: "/events" },
        ]}
      />

      <SectionCard className={`${styles.sectionCard} ${styles.bannerCard}`}>
        <Image
          src={CCBM_IMAGES.banner}
          alt="Students learning Torah at Mekor"
          width={1366}
          height={355}
          sizes="(max-width: 768px) 100vw, 1200px"
          className={styles.bannerImage}
          loading="lazy"
        />
        <div className={styles.bannerBody}>
          <p className={styles.bannerTitle}>Summer Classes at Mekor!</p>
          <p className={styles.bannerText}>
            *Contact Rabbi Gotlib for Zoom Info
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Summer Classes" className={styles.sectionCard}>
        <div className={styles.scheduleGrid}>
          {SUMMER_CLASSES.map((item) => (
            <article key={item.name} className={styles.scheduleCard}>
              <h3>{item.name}</h3>
              <p>
                {item.day} • {item.time}
              </p>
            </article>
          ))}
        </div>
        <p className={styles.note}>
          Contact Rabbi Gotlib for Zoom Info.
        </p>
      </SectionCard>

      <SectionCard title="Daily Amud Yomi Shiur - With Cereal!" className={styles.sectionCard}>
        <ul className={styles.bulletList}>
          <li>Join us each weekday morning after Shacharis for a brief and engaging Amud Yomi shiur, led by Rabbi Gotlib.</li>
          <li>The class is under 20 minutes and open to all levels.</li>
          <li>Cold cereal breakfast is served during the shiur.</li>
          <li>Sunday: 8:30 AM Shacharis, shiur follows Shacharis.</li>
          <li>Monday - Friday: 6:45 / 6:55 AM Shacharis, shiur begins 7:40 AM and ends 8:00 AM.</li>
          <li>Start your day with Torah, and a bowl of cereal!</li>
        </ul>
      </SectionCard>

      <SectionCard title="Mission Statement" className={styles.sectionCard}>
        <p className={styles.bodyText}>
          The Center City Beit Midrash (CCBM) is an inclusive, learning-centered organization committed to providing
          high-quality educational experiences for those seeking meaningful engagement with Jewish texts and traditions.
        </p>
        <p className={styles.bodyText}>
          Through weekly classes and Shabbat programming, CCBM helps participants deepen their connection to Jewish
          learning and integrate it into their personal and communal lives.
        </p>
      </SectionCard>

      <SectionCard title="Quick Links" className={styles.sectionCard}>
        <CTACluster
          className={styles.quickLinksCluster}
          items={[
            { label: "Contact CCBM", href: "mailto:admin@mekorhabracha.org?subject=CCBM%20Inquiry" },
            { label: "Davening Schedule", href: "/davening" },
            { label: "Events Calendar", href: "/events" },
            { label: "Volunteer", href: "/team-4" },
          ]}
        />
      </SectionCard>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
