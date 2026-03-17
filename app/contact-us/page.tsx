import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { ContactForm } from "@/components/medium-pages/contact-form";
import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { CTACluster, HeroSection, SectionCard } from "@/components/marketing/primitives";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import styles from "./page.module.css";

const PATH = "/contact-us" as const;

const CONTACT_IMAGES = {
  hero: "/images/contact-us/hero.jpg",
  banner: "/images/contact-us/banner.jpg",
} as const;

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath(PATH);
  return buildDocumentMetadata(document);
}

export default async function ContactUsPage() {
  const document = await getNativeDocumentByPath(PATH);

  if (!document) {
    notFound();
  }

  return (
    <MarketingPageShell currentPath={PATH} className={styles.page} contentClassName={styles.stack}>
      <HeroSection
        eyebrow="Get in Touch"
        title="Contact Us"
        subtitle="We would love to hear from you"
        className={styles.heroFlat}
        image={{
          src: CONTACT_IMAGES.hero,
          alt: "Mekor contact and community",
          objectFit: "cover",
          objectPosition: "50% 33%",
        }}
        description={[
          "We'd love to hear from you.",
          "Reach out for membership questions, scheduling details, event inquiries, or general community support.",
        ]}
        actions={[
          { label: "Email mekorhabracha@gmail.com", href: "mailto:mekorhabracha@gmail.com" },
          { label: "Call (215) 525-4246", href: "tel:+12155254246" },
        ]}
      />

      <SectionCard className={`${styles.flatSection} ${styles.bannerCard}`}>
        <Image
          src={CONTACT_IMAGES.banner}
          alt="Mekor contact banner"
          width={1366}
          height={355}
          sizes="(max-width: 768px) 100vw, 1200px"
          className={styles.bannerImage}
          loading="lazy"
        />
      </SectionCard>

      <SectionCard title="Contact Details" className={`${styles.flatSection} ${styles.detailsSection}`}>
        <div className={styles.detailGrid}>
          <article className={styles.detailCard}>
            <h3>Phone</h3>
            <p>
              <a href="tel:+12155254246">(215) 525-4246</a>
            </p>
          </article>
          <article className={styles.detailCard}>
            <h3>General Email</h3>
            <p>
              <a href="mailto:mekorhabracha@gmail.com">mekorhabracha@gmail.com</a>
            </p>
          </article>
          <article className={styles.detailCard}>
            <h3>Admin Email</h3>
            <p>
              <a href="mailto:admin@mekorhabracha.org">admin@mekorhabracha.org</a>
            </p>
          </article>
        </div>
      </SectionCard>

      <SectionCard title="Send a Message" className={`${styles.flatSection} ${styles.messageSection}`}>
        <ContactForm sourcePath={PATH} />
      </SectionCard>

      <SectionCard title="Visit the Shul" className={`${styles.flatSection} ${styles.visitSection}`}>
        <div className={styles.visitGrid}>
          <div className={styles.visitCard}>
            <h3>Address</h3>
            <p>1500 Walnut St, Suite 206</p>
            <p>Philadelphia, PA 19102</p>

            <h3>When to Come</h3>
            <p>Reach out before visiting for weekday minyan details, class timing, or to coordinate building access.</p>

            <h3>Getting Here</h3>
            <p>We are in Center City, a short walk from SEPTA regional rail, PATCO, and multiple bus lines.</p>

            <h3>Parking and Access</h3>
            <p>Nearby garages and street parking are available throughout the neighborhood. Contact us if you need help planning your visit.</p>

            <CTACluster
              className={styles.visitLinks}
              items={[
                { label: "Open in Google Maps", href: "https://maps.google.com/?q=1500+Walnut+St+Suite+206+Philadelphia+PA+19102" },
                { label: "Email for Visiting Info", href: "mailto:mekorhabracha@gmail.com?subject=Visiting%20Mekor" },
              ]}
            />
          </div>
          <div className={styles.locationPanel}>
            <p className={styles.locationEyebrow}>Center City Philadelphia</p>
            <h3 className={styles.locationTitle}>1500 Walnut Street, Suite 206</h3>
            <p className={styles.locationCopy}>
              Mekor is located in the heart of Center City, close to transit, neighborhood parking, restaurants, and the Rittenhouse area.
            </p>
            <div className={styles.locationHighlights}>
              <span>Near SEPTA regional rail and PATCO</span>
              <span>Walkable from Rittenhouse Square</span>
              <span>Best to coordinate ahead for weekday access</span>
            </div>
            <CTACluster
              className={styles.visitLinks}
              items={[
                { label: "Open in Google Maps", href: "https://maps.google.com/?q=1500+Walnut+St+Suite+206+Philadelphia+PA+19102" },
                { label: "Call the Shul", href: "tel:+12155254246" },
              ]}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Mekor Community WhatsApp"
        description="Click the WhatsApp logo to join our Mekor Community group and stay up to date with everything happening in our shul and community."
        className={`${styles.flatSection} ${styles.whatsAppSection}`}
      >
        <CTACluster
          className={styles.whatsAppLinks}
          items={[
            { label: "Join Mekor WhatsApp", href: "https://chat.whatsapp.com/INZrPssTZeHK5xrx5ghECF" },
            { label: "Open in Google Maps", href: "https://maps.google.com/?q=1500+Walnut+St+Suite+206+Philadelphia+PA+19102" },
            { label: "Visit Us", href: "/visit-us" },
            { label: "Latest Newsletters", href: "https://us2.campaign-archive.com/home/?u=f9fe87a16c42c24704c099073&id=94f3350887" },
          ]}
        />
      </SectionCard>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
