import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { CTACluster, HeroSection, SectionCard, SplitMediaText } from "@/components/marketing/primitives";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import styles from "./page.module.css";

const PATH = "/philly-jewish-community" as const;
const ERUV_MAP_EMBED = "https://www.google.com/maps/d/embed?mid=1BYICpqwoJO1Ih4fOUKfTwm-gzeaCkBQG&ehbc=2E312F";

const COMMUNITY_IMAGES = {
  hero: "/images/community/hero.jpg",
  eruv: "/images/community/eruv.jpeg",
  mikvah: "/images/community/mikvah.jpeg",
} as const;

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath(PATH);
  return buildDocumentMetadata(document);
}

export default async function PhillyJewishCommunityPage() {
  const document = await getNativeDocumentByPath(PATH);

  if (!document) {
    notFound();
  }

  return (
    <MarketingPageShell currentPath={PATH} className={styles.page} contentClassName={styles.stack}>
      <HeroSection
        title="Philly Jewish Community"
        subtitle="Center City resources and institutions"
        image={{
          src: COMMUNITY_IMAGES.hero,
          alt: "Mekor Habracha community celebration",
          objectFit: "cover",
          objectPosition: "center center",
        }}
        description={[
          "We are fortunate to be part of a warm, caring, and growing Jewish community in Center City and South Philadelphia.",
          "Below are core resources for eruv boundaries, kosher establishments, and mikvah access.",
        ]}
      />

      <SectionCard>
        <SplitMediaText
          title="Center City Eruv"
          kicker="Community Infrastructure"
          media={{
            src: COMMUNITY_IMAGES.eruv,
            alt: "Center City community streetscape near eruv area",
          }}
          paragraphs={[
            "The Center City Eruv includes most of Center City and South Philadelphia, roughly between the Schuylkill and Delaware Rivers.",
            "Please note that the map is not perfectly to scale and should be used together with weekly status updates and published boundary notes.",
            "Carrying is permitted over the South Street Bridge when the bridge extension is up; if that extension is down, the rest of the Center City Eruv remains valid.",
          ]}
          links={[
            { label: "Center City Eruv Website", href: "http://www.centercityeruv.org/map.asp" },
            { label: "Open Eruv Map in New Tab", href: ERUV_MAP_EMBED },
          ]}
        />
        <div className={styles.mapShell}>
          <iframe
            className={styles.mapFrame}
            src={ERUV_MAP_EMBED}
            title="Center City Eruv interactive map"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
        <ul className={styles.guidelineList}>
          <li>Western border: The Schuylkill River Trail is no longer included.</li>
          <li>Southwest corner: South of Washington Ave, areas west of 25th St are outside the eruv.</li>
          <li>Northern border: The eruv remains bounded by the south side of Poplar Street.</li>
          <li>Eastern border: Runs approximately along I-95; Columbus Boulevard waterfront is outside.</li>
          <li>Southern border: Continues to follow I-76.</li>
        </ul>
      </SectionCard>

      <SectionCard>
        <SplitMediaText
          reverse
          title="Kosher Establishments"
          kicker="Dining and Shopping"
          media={{
            src: COMMUNITY_IMAGES.hero,
            alt: "Jewish community gathering in Philadelphia",
          }}
          paragraphs={[
            "Center City and surrounding neighborhoods now include a growing number of kosher restaurants, cafes, bakeries, and specialty options.",
            "This growth has been supported by dedicated community members and ongoing supervision efforts.",
          ]}
          links={[
            { label: "Map of Kosher Establishments", href: "/kosher-map" },
            { label: "Center City Kosher Directory", href: "/center-city" },
          ]}
        />
      </SectionCard>

      <SectionCard>
        <SplitMediaText
          title="Mikvaot"
          kicker="Family and Lifecycle Resources"
          media={{
            src: COMMUNITY_IMAGES.mikvah,
            alt: "Center City community mikvah",
          }}
          paragraphs={[
            "The Mei Shalva Center City Community Mikvah at 509 Pine Street provides a fully operational women’s mikvah, men’s mikvah, and keilim mikvah.",
            "For scheduling and appointments, please visit philamikvah.org or call/text 267-225-2651.",
          ]}
          links={[
            { label: "Mikvah Website", href: "https://philamikvah.org/" },
            { label: "Schedule Now", href: "https://philamikvah.org/appointments/" },
          ]}
        />
      </SectionCard>

      <SectionCard title="Community Links">
        <CTACluster
          items={[
            { label: "Center City Eruv", href: "http://www.centercityeruv.org/map.asp" },
            { label: "Kosher Map", href: "/kosher-map" },
            { label: "Center City Kosher Places", href: "/center-city" },
            { label: "Philadelphia Mikvah", href: "https://philamikvah.org/" },
            { label: "Contact Mekor", href: "/contact-us" },
          ]}
        />
      </SectionCard>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
