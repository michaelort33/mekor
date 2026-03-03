import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RabbiDeskPodcastList } from "@/components/podcast/rabbi-desk-podcast-list";
import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { CTACluster, HeroSection, SectionCard } from "@/components/marketing/primitives";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import styles from "./page.module.css";

const PATH = "/from-the-rabbi-s-desk" as const;

const RABBI_DESK_IMAGE = "/images/rabbi-desk/hero.jpg";

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath(PATH);
  return buildDocumentMetadata(document);
}

export default async function FromTheRabbisDeskPage() {
  const document = await getNativeDocumentByPath(PATH);

  if (!document) {
    notFound();
  }

  return (
    <MarketingPageShell currentPath={PATH} className={styles.page} contentClassName={styles.stack}>
      <HeroSection
        eyebrow="Teachings"
        title="From The Rabbi's Desk"
        subtitle="Podcast teachings, insights, and weekly Torah reflections"
        image={{
          src: RABBI_DESK_IMAGE,
          alt: "Rabbi's desk and Torah study",
          objectFit: "cover",
          objectPosition: "50% 30%",
        }}
        description={[
          "Browse podcast episodes, search by title or topic, and listen directly from this page.",
          "New episodes are pulled into this page automatically from our live feed.",
        ]}
        actions={[
          { label: "Listen to Recent Episodes", href: "#podcast-list" },
          { label: "Events", href: "/events" },
        ]}
      />

      <SectionCard title="Podcast Library" description="Search, stream, and browse episodes from Mekor's teaching archive.">
        <div id="podcast-list" className={styles.anchor} />
        <RabbiDeskPodcastList />
      </SectionCard>

      <SectionCard title="Related Learning Links">
        <CTACluster
          items={[
            { label: "Center City Beit Midrash", href: "/center-city-beit-midrash" },
            { label: "Davening", href: "/davening" },
            { label: "Israel Learning Initiatives", href: "/israel" },
            { label: "Contact Us", href: "/contact-us" },
          ]}
        />
      </SectionCard>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
