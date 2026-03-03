import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { CTACluster, HeroSection, SectionCard } from "@/components/marketing/primitives";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import styles from "./page.module.css";

const PATH = "/testimonials" as const;

const TESTIMONIAL_IMAGES = {
  hero: "/images/testimonials/hero.jpg",
  banner: "/images/testimonials/banner.jpg",
} as const;

const TESTIMONIALS = [
  {
    quote:
      "Thank you, Rabbi Hirsch, for being a role model, teacher, and friend. With incredible care and wisdom, you guide and support the community through life's challenges.",
    by: "Member",
  },
  {
    quote: "We're sponsoring Kiddush to thank the Mekor community for a warm welcome.",
    by: "Members",
  },
  {
    quote:
      "Mekor Habracha will always hold a special place in our hearts; we will forever feel part of the family.",
    by: "Alum",
  },
  {
    quote: "You made us feel like we were long-time members of your congregation.",
    by: "Visitor",
  },
  {
    quote:
      "Thank you for the vibrant community over my years in Philly. I wanted to express my deep appreciation.",
    by: "Former Community Member",
  },
  {
    quote: "Mekor has been a source of social connection, support, and spirituality for years. We love this kehilla.",
    by: "Member",
  },
  {
    quote: "It's a wonderful kehilla. I am impressed with your dedication, intellect, and humanity.",
    by: "Visitor",
  },
  {
    quote: "Thank you for creating a community where I can daven every Shabbat.",
    by: "Bat Mitzvah Girl",
  },
  {
    quote:
      "Your insightful guide, Bringing Order to the Seder, was deeply appreciated. Keep writing, your work is excellent.",
    by: "Community Supporter",
  },
] as const;

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath(PATH);
  return buildDocumentMetadata(document);
}

export default async function TestimonialsPage() {
  const document = await getNativeDocumentByPath(PATH);

  if (!document) {
    notFound();
  }

  return (
    <MarketingPageShell currentPath={PATH} className={styles.page} contentClassName={styles.stack}>
      <HeroSection
        eyebrow="Community Voices"
        title="A Few of Mekor's Eclectic Testimonials"
        subtitle="What members, alumni, and visitors share about life at Mekor"
        image={{
          src: TESTIMONIAL_IMAGES.hero,
          alt: "Mekor community gathering",
          objectFit: "cover",
          objectPosition: "50% 34%",
        }}
        description={[
          "These reflections are preserved from years of member notes and community correspondence.",
          "They represent the warmth, seriousness, and openness that define our shul.",
        ]}
        actions={[
          {
            label: "Pre-Passover Letter (PDF)",
            href: "https://www.mekorhabracha.org/_files/ugd/92f487_649e9ef91ce343ab81f0cd94411298e2.pdf",
          },
          { label: "Join Us", href: "mailto:admin@mekorhabracha.org?subject=Join%20Us" },
        ]}
      />

      <SectionCard className={styles.bannerCard}>
        <Image
          src={TESTIMONIAL_IMAGES.banner}
          alt="Mekor testimonial banner"
          width={1366}
          height={355}
          sizes="(max-width: 768px) 100vw, 1200px"
          className={styles.bannerImage}
          loading="lazy"
        />
      </SectionCard>

      <SectionCard title="Testimonials">
        <div className={styles.quoteGrid}>
          {TESTIMONIALS.map((entry, index) => (
            <article key={`${entry.by}-${index}`} className={styles.quoteCard}>
              <p className={styles.quoteText}>&ldquo;{entry.quote}&rdquo;</p>
              <p className={styles.quoteBy}>~ {entry.by}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Connect With Mekor">
        <CTACluster
          items={[
            { label: "Membership", href: "/membership" },
            { label: "Visit Us", href: "/visit-us" },
            { label: "Contact Us", href: "/contact-us" },
            { label: "Events", href: "/events" },
          ]}
        />
      </SectionCard>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
