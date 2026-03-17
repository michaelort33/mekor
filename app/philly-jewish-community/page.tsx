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
        className={styles.heroFlat}
        image={{
          src: COMMUNITY_IMAGES.hero,
          alt: "Mekor Habracha community celebration",
          objectFit: "cover",
          objectPosition: "center center",
        }}
        description={[
          "We're fortunate to be part of a warm, caring, and growing community, thanks in large part to the efforts of the Mekor community.",
          "Below are just a few of the incredible Jewish establishments and resources that have taken root here.",
        ]}
      />

      <SectionCard className={styles.flatSection}>
        <SplitMediaText
          className={styles.splitPanel}
          title="Center City Eruv"
          kicker="Community Infrastructure"
          media={{
            src: COMMUNITY_IMAGES.eruv,
            alt: "Center City community streetscape near eruv area",
          }}
          paragraphs={[
            "The Center City Eruv includes most of Center City and South Philadelphia, roughly between the Schuylkill and Delaware Rivers. It is maintained weekly and was originally constructed under the halachic guidance of Rav Dov Aaron Brisman zt\"l, former Av Beit Din of Philadelphia.",
            "Please note that the map is not perfectly to scale and should be used together with weekly status updates and published boundary notes.",
            "Carrying is permitted over the South Street Bridge, which connects the Center City Eruv with the University City Eruv. If this bridge extension is down, the rest of the Center City Eruv remains valid.",
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
          <li>Southwest corner: South of Washington Avenue, areas west of 25th Street are no longer included. North of Washington, the eruv follows the train overpass.</li>
          <li>Northern border: The eruv remains bounded by the south side of Poplar Street.</li>
          <li>Eastern border: The eruv runs approximately along I-95. Columbus Boulevard and the waterfront are outside the eruv.</li>
          <li>Southern border: The eruv continues to follow I-76.</li>
        </ul>
      </SectionCard>

      <SectionCard className={styles.flatSection}>
        <SplitMediaText
          className={styles.splitPanel}
          reverse
          title="Kosher Establishments"
          kicker="Dining and Shopping"
          media={{
            src: COMMUNITY_IMAGES.hero,
            alt: "Jewish community gathering in Philadelphia",
          }}
          paragraphs={[
            "We are so lucky to have so many kosher options in and around Center City Philly with a special thank you to Rabbi Hirsch and his mashgiach volunteers that have greatly expanded the kosher options.",
            "Browse the map of kosher establishments and the neighborhood directories for more local detail.",
          ]}
          links={[
            { label: "Map of Kosher Establishments", href: "/kosher-map" },
            { label: "Center City Kosher Directory", href: "/center-city" },
          ]}
        />
      </SectionCard>

      <SectionCard className={styles.flatSection}>
        <SplitMediaText
          className={styles.splitPanel}
          title="Mikvaot"
          kicker="Family and Lifecycle Resources"
          media={{
            src: COMMUNITY_IMAGES.mikvah,
            alt: "Center City community mikvah",
          }}
          paragraphs={[
            "A mikvah is a natural body of water or a gathering of water that has a designated connection to a pool designed specifically for immersion according to the rules and customs of Jewish law.",
            "The Mei Shalva Center City Community Mikvah at 509 Pine Street offers a fully operational women's mikvah, men's mikvah, and keilim mikvah. Volunteers are welcome to assist with staffing the keilim mikvah. For scheduling or appointments, please visit philamikvah.org or call or text 267-225-2651.",
          ]}
          links={[
            { label: "Mikvah Website", href: "https://philamikvah.org/" },
            { label: "Schedule Now", href: "https://philamikvah.org/appointments/" },
          ]}
        />
      </SectionCard>

      <SectionCard title="Community Links" className={styles.flatSection}>
        <CTACluster
          className={styles.communityLinks}
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
