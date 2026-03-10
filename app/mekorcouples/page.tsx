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
  hero: "/images/mekor-couples/hero.jpg",
  banner: "/images/mekor-couples/banner.svg",
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
  "Yael Leiner & David Parvey — Aug. 5, 2020",
  "Talia Berday-Sacks & Sam Major — Oct. 24, 2021",
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
        eyebrow="Community Milestones"
        title="Mekor Couples"
        subtitle="We celebrate our Mekor couples"
        image={{
          src: COUPLES_IMAGES.hero,
          alt: "Mekor couples celebration",
          objectFit: "cover",
          objectPosition: "50% 28%",
        }}
        description={[
          "We celebrate our Mekor couples.",
          "We wish them endless happiness and blessings as they prepare to build their lives together.",
        ]}
        actions={[
          { label: "Share an Update", href: "mailto:admin@mekorhabracha.org?subject=Mekor%20Couples%20Update" },
          { label: "Community Events", href: "/events" },
        ]}
      />

      <SectionCard className={styles.bannerCard}>
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

      <SectionCard title="Engagements">
        <p className={styles.bodyText}>
          Love blooms, promises made. We celebrate the joy of Mekor couples&apos; engagements and wish them endless
          happiness and blessings as they prepare to build their lives together.
        </p>
      </SectionCard>

      <SectionCard title="Marriages">
        <ol className={styles.marriageList}>
          {MARRIAGES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <p className={styles.footnote}>
          A &quot;Mekor Couple&quot; is a married, or soon to be married, couple who initially met at Mekor or at a
          Mekor community event.
        </p>
      </SectionCard>

      <SectionCard title="Get Involved">
        <CTACluster
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
