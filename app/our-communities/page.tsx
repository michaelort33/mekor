import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { CTACluster, HeroSection, SectionCard } from "@/components/marketing/primitives";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import styles from "./page.module.css";

const PATH = "/our-communities" as const;

const COMMUNITY_IMAGES = {
  hero: "/images/our-communities/hero.jpg",
  banner: "/images/our-communities/banner.jpg",
} as const;

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath(PATH);
  return buildDocumentMetadata(document);
}

export default async function OurCommunitiesPage() {
  const document = await getNativeDocumentByPath(PATH);

  if (!document) {
    notFound();
  }

  return (
    <MarketingPageShell currentPath={PATH} className={styles.page} contentClassName={styles.stack}>
      <HeroSection
        eyebrow="Our Community"
        title="Mekor Habracha Community"
        subtitle="A welcoming, growing Orthodox community in Center City"
        image={{
          src: COMMUNITY_IMAGES.hero,
          alt: "Mekor community gathering",
          objectFit: "cover",
          objectPosition: "50% 34%",
        }}
        description={[
          "Mekor serves students, professionals, families, and long-time residents from across Philadelphia.",
          "Visitors are always welcome, and members are encouraged to get involved through learning, volunteering, and leadership.",
        ]}
        actions={[
          { label: "Contact Us", href: "/contact-us" },
          { label: "Join Us", href: "mailto:admin@mekorhabracha.org?subject=Join%20Us" },
        ]}
      />

      <SectionCard className={styles.bannerCard}>
        <Image
          src={COMMUNITY_IMAGES.banner}
          alt="Mekor community life"
          width={1366}
          height={355}
          sizes="(max-width: 768px) 100vw, 1200px"
          className={styles.bannerImage}
          loading="lazy"
        />
      </SectionCard>

      <SectionCard title="Our History">
        <p className={styles.bodyText}>
          Mekor Habracha emerged from an independent chavura in the 1990s in the Rittenhouse area. From 1999 to 2001
          the group met under Etz Chaim, then continued as a lay-led community until Rabbi Eliezer Hirsch began
          leading the congregation in 2006.
        </p>
        <p className={styles.bodyText}>
          Since then, Mekor has grown into an independent synagogue and a major force in Jewish life in Center City.
        </p>
        <div className={styles.linkRow}>
          <a href="https://aishchaim.com/" target="_blank" rel="noreferrer noopener">
            Aish Chaim
          </a>
          <a
            href="https://mekorhabracha.github.io/2013/10/16/modern-orthodox-community.html"
            target="_blank"
            rel="noreferrer noopener"
          >
            Read about Mekor&apos;s origins
          </a>
          <a
            href="https://www.jewishexponent.com/mekor-habracha-continues-to-bring-orthodox-vibrancy-to-center-city/"
            target="_blank"
            rel="noreferrer noopener"
          >
            Jewish Exponent feature
          </a>
        </div>
      </SectionCard>

      <SectionCard title="Our Mission and Culture">
        <div className={styles.valueGrid}>
          <article className={styles.valueCard}>
            <h3>Mission</h3>
            <p>
              Serve the spiritual, social, and educational needs of Center City&apos;s diverse Jewish community.
            </p>
          </article>
          <article className={styles.valueCard}>
            <h3>Who We Are</h3>
            <p>
              An inclusive Orthodox congregation where people of all ages and backgrounds can connect, learn, and grow.
            </p>
          </article>
          <article className={styles.valueCard}>
            <h3>Participation</h3>
            <p>
              Members take active roles in volunteering, hospitality, programming, and leadership across the year.
            </p>
          </article>
        </div>
      </SectionCard>

      <SectionCard title="Explore Community Life">
        <CTACluster
          items={[
            { label: "Mekor Couples", href: "/mekorcouples" },
            { label: "Volunteer", href: "/team-4" },
            { label: "Davening", href: "/davening" },
            { label: "From the Rabbi's Desk", href: "/from-the-rabbi-s-desk" },
          ]}
        />
      </SectionCard>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
