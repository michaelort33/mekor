import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { CTACluster, HeroSection, InlineLink, SectionCard, SplitMediaText } from "@/components/marketing/primitives";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import styles from "./page.module.css";

const PATH = "/philly-jewish-community" as const;
const ERUV_MAP_EMBED = "https://www.google.com/maps/d/embed?mid=1BYICpqwoJO1Ih4fOUKfTwm-gzeaCkBQG&ehbc=2E312F";

const COMMUNITY_IMAGES = {
  hero: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/f45232d3ec413a7ff32e7e78e4fc253ea6644a78-hero.jpg",
  eruv: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/41138b8b7b55082f177266447913d1b86b776be1-eruv.jpeg",
  mikvah: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/3756d0a298aac6431bc117d883a74b4776a8e84e-mikvah.jpeg",
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
        tone="dark"
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
            <>
              Review the boundaries on the <InlineLink href="http://www.centercityeruv.org/map.asp">Center City Eruv website</InlineLink> or <InlineLink href={ERUV_MAP_EMBED}>open the interactive eruv map in a new tab</InlineLink>. The map is not perfectly to scale, so use the guidelines below for accuracy.
            </>,
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
        <p className={styles.mapNote}>
          This map shows the borders of the Center City Eruv. It is an interactive map powered by Google Maps; you can zoom in or out and move the map around by holding the left mouse button and dragging the cursor. The map is not perfectly to scale, so please use the following guidelines:
        </p>
        <div className={styles.guidelineList}>
          <div className={styles.guidelineItem}>
            <h4>Western Border</h4>
            <p>The Schuylkill River Trail is no longer included in the eruv.</p>
          </div>
          <div className={styles.guidelineItem}>
            <h4>Southwest Corner</h4>
            <p>South of Washington Avenue, areas west of 25th Street are no longer included. North of Washington, the eruv follows the train overpass.</p>
          </div>
          <div className={styles.guidelineItem}>
            <h4>Northern Border</h4>
            <p>The eruv remains bounded by the south side of Poplar Street.</p>
          </div>
          <div className={styles.guidelineItem}>
            <h4>Eastern Border</h4>
            <p>The eruv runs approximately along I-95. Columbus Boulevard and the waterfront are outside the eruv.</p>
          </div>
          <div className={styles.guidelineItem}>
            <h4>Southern Border</h4>
            <p>The eruv continues to follow I-76.</p>
          </div>
          <div className={styles.guidelineItem}>
            <h4>South Street Bridge</h4>
            <p>Carrying is permitted over the South Street Bridge, which connects the Center City Eruv with the University City Eruv. Please note: if this bridge extension is down, the rest of the Center City Eruv remains valid. Please check the weekly eruv status before Shabbat and plan accordingly.</p>
          </div>
        </div>
        <p className={styles.mapNote}>
          Please note: We&apos;re currently working on an updated eruv map, which will be available soon, so please be on the lookout for it. The map on this page is out of date, given the above changes.
        </p>
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
            <>
              Browse the <InlineLink href="/kosher-map">map of kosher establishments</InlineLink> and the <InlineLink href="/center-city">Center City kosher directory</InlineLink> for more local detail.
            </>,
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
            "A Mikvah is a natural body of water or a gathering of water that has a designated connection to a pool designed specifically for immersion, according to the rules and customs of Jewish law.",
            "The above body of water consists of naturally collected water that was never stagnant or gathered by human means. It contains about 200 gallons of water.",
            <>
              The Mei Shalva Center City Community Mikvah at 509 Pine Street offers a fully operational women&apos;s mikvah, men&apos;s mikvah, and keilim mikvah. Volunteers are welcome to assist with staffing the keilim mikvah. Visit the <InlineLink href="https://philamikvah.org/">mikvah website</InlineLink>, <InlineLink href="https://philamikvah.org/appointments/">schedule an appointment</InlineLink>, or call or text <InlineLink href="tel:+12672252651">267-225-2651</InlineLink>.
            </>,
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
