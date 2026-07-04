import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { CTACluster, HeroSection, SectionCard } from "@/components/marketing/primitives";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import styles from "./page.module.css";

const PATH = "/mekorcouples" as const;

const COUPLES_IMAGES = {
  hero: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/6d7033f5d596ba044ad4159a267ea1248c97bd48-hero.jpg",
  banner: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/e41308710e5aa85ee3e1efe3475cd2f0415fb2c0-banner.svg",
} as const;

const MARRIAGES = [
  "Melissa Blashka & Anthony Krinsky — Dec. 19, 2010",
  "Yah-el Har-el & Andres Catalan — Mar. 11, 2012",
  "Ayla Tolosa & Evan Kline — Nov. 4, 2012",
  "Donna Cohen & Bill Moritz — Mar. 10, 2013",
  "Orly Coblens & Andrew Feigenblatt — May 8, 2016",
  "Miriam Vayeira & David Morley — Aug. 28, 2016",
  "Kayla Ross & Adam Romanoski — Aug. 13, 2017",
  "Elana Itzkowitz & Alex Marder — Nov. 11, 2018",
  "Rebecca Berliner & Ben Falk — Dec. 30, 2018",
  "Rebecca Somach & Shaul Kushinsky — Sept. 1, 2019",
  "Marla Benedek & Adam Mayer — Sept. 22, 2019",
  "Yael Leiner & David Parvey — August 5, 2020",
  "Talia Berday-Sacks & Sam Major — October 24, 2021",
  "Gwenn Barney & Jonathan Goldstein — Sept. 18, 2022",
  "Elana Perlow & Corey Freeman — May 29, 2023",
] as const;

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath(PATH);
  return buildDocumentMetadata(document);
}

export default async function MekorCouplesPage() {
  const document = await getNativeDocumentByPath(PATH);

  if (!document) {
    notFound();
  }

  return (
    <MarketingPageShell currentPath={PATH} className={styles.page} contentClassName={styles.stack}>
      <HeroSection
        eyebrow="Mekor Couples"
        title="Mekor Couples"
        subtitle="We Celebrate Our Mekor Couples!*"
        className={styles.heroSection}
        image={{
          src: COUPLES_IMAGES.hero,
          alt: "Mekor couples celebration",
          objectFit: "cover",
          objectPosition: "50% 28%",
        }}
        description={[
          "Love blooms, promises made. We celebrate the joy of Mekor couples' engagements!",
          "We wish them endless happiness and blessings as they prepare to build their lives together.",
        ]}
        actions={[
          { label: "Share an Update", href: "mailto:admin@mekorhabracha.org?subject=Mekor%20Couples%20Update" },
          { label: "Community Events", href: "/events" },
        ]}
      />

      <SectionCard className={`${styles.sectionCard} ${styles.bannerCard}`}>
        <Image
          src={COUPLES_IMAGES.banner}
          alt="Mazel tov banner for Mekor couples"
          width={1366}
          height={355}
          sizes="(max-width: 768px) 100vw, 1200px"
          className={styles.bannerImage}
          loading="lazy"
        />
      </SectionCard>

      <SectionCard title="Engagements" className={styles.sectionCard}>
        <p className={styles.bodyText}>
          Love blooms, promises made. We celebrate the joy of Mekor couples&apos; engagements! We wish them endless
          happiness and blessings as they prepare to build their lives together.
        </p>
      </SectionCard>

      <SectionCard title="Marriages" className={styles.sectionCard}>
        <ol className={styles.marriageList}>
          {MARRIAGES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <p className={styles.footnote}>
          *A &quot;Mekor Couple&quot; is a married (or soon to be married) couple who initially met at Mekor or at a
          Mekor community event :)
        </p>
      </SectionCard>

      <SectionCard title="Get Involved" className={styles.sectionCard}>
        <CTACluster
          className={styles.linksCluster}
          items={[
            { label: "Membership", href: "/membership" },
            { label: "Volunteer", href: "/team-4" },
            { label: "Contact Us", href: "/contact-us" },
            { label: "Upcoming Events", href: "/events" },
          ]}
        />
      </SectionCard>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
