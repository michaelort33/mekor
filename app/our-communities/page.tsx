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
        className={styles.heroFlat}
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

      <SectionCard className={`${styles.flatSection} ${styles.bannerCard}`}>
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

      <SectionCard title="Our History" className={styles.flatSection}>
        <p className={styles.bodyText}>
          Becoming a Community
        </p>
        <p className={styles.bodyText}>
          Mekor Habracha emerged from a 1990s independent chavura in the Rittenhouse Square area of Philadelphia. From
          1999 to 2001 the group met under the auspices of Etz Chaim, currently Aish Chaim, and reverted to being mainly
          lay-led until 2006, when Etz Chaim recruited Rabbi Eliezer Hirsch from New York to lead the group. Since Rabbi
          Hirsch&apos;s arrival, the congregation has grown and flourished, eventually becoming an independent synagogue in
          2007, and is now a critical contributing organization to the advancement of Jewish life in Center City.
        </p>
        <p className={styles.bodyText}>
          You can read more about Mekor&apos;s origins and subsequent growth here, and a recent article about our
          community here.
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

      <SectionCard title="Our Mission and Culture" className={styles.flatSection}>
        <div className={styles.valueGrid}>
          <article className={styles.valueCard}>
            <h3>Mission</h3>
            <p>
              Serve the Center City Jewish Community. The mission of Mekor Habracha is to serve the spiritual, social,
              and educational needs of Center City&apos;s diverse Jewish community. We aspire to provide an environment
              where people of all ages and religious backgrounds are welcome to participate in the synagogue&apos;s
              activities and Orthodox services.
            </p>
          </article>
          <article className={styles.valueCard}>
            <h3>Who We Are</h3>
            <p>
              Mekor Habracha is a vibrant and inclusive congregation located in Center City, Philadelphia. Our
              membership is diverse, drawing people from all across the city, and visitors, whether local residents or
              out-of-towners, are always welcome.
            </p>
          </article>
          <article className={styles.valueCard}>
            <h3>Participation</h3>
            <p>
              Since it was founded, the shul has attracted a dynamic group of students, young professionals, newlyweds,
              families, and empty nesters. We offer a range of religious, educational, and social activities, as well
              as plenty of opportunities for community members to get involved. We are especially proud that a number of
              wonderfully matched married couples first met at Mekor.
            </p>
          </article>
        </div>
      </SectionCard>

      <SectionCard title="Explore Community Life" className={styles.flatSection}>
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
