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
  hero: "/images/beit-midrash/hero.jpeg",
  banner: "/images/beit-midrash/banner.jpg",
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
        subtitle="Serious Torah learning in a warm, accessible community setting"
        image={{
          src: CCBM_IMAGES.hero,
          alt: "Center City Beit Midrash learning session",
          objectFit: "cover",
          objectPosition: "50% 30%",
        }}
        description={[
          "CCBM offers weekly classes, daily Amud Yomi, and ongoing opportunities to engage deeply with Jewish texts.",
          "All levels are welcome. If this is your first class, contact us and we will help you get started.",
        ]}
        actions={[
          { label: "Email for Class Details", href: "mailto:admin@mekorhabracha.org?subject=CCBM%20Classes" },
          { label: "View Upcoming Events", href: "/events" },
        ]}
      />

      <SectionCard className={styles.bannerCard}>
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
          <p className={styles.bannerTitle}>Summer Classes at Mekor</p>
          <p className={styles.bannerText}>
            Structured, consistent classes with room for discussion and practical takeaways.
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Class Schedule">
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
          Contact Rabbi Gotlib for Zoom details and any current schedule updates.
        </p>
      </SectionCard>

      <SectionCard title="Daily Amud Yomi (With Cereal)">
        <ul className={styles.bulletList}>
          <li>Sunday: follows 8:30 AM Shacharit.</li>
          <li>Monday-Friday: starts around 7:40 AM and concludes by 8:00 AM.</li>
          <li>Open to all levels, with practical guidance and approachable pace.</li>
        </ul>
      </SectionCard>

      <SectionCard title="Mission">
        <p className={styles.bodyText}>
          CCBM provides high-quality educational opportunities for people seeking meaningful engagement with Jewish
          learning. Through classes, shiurim, and Shabbat programming, participants deepen connection to Torah and
          community.
        </p>
      </SectionCard>

      <SectionCard title="Quick Links">
        <CTACluster
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
