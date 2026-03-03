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

const MAP_EMBED_SRC =
  "https://www.google.com/maps?q=1500+Walnut+St+Suite+206+Philadelphia+PA+19102&output=embed";

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
        image={{
          src: CONTACT_IMAGES.hero,
          alt: "Mekor contact and community",
          objectFit: "cover",
          objectPosition: "50% 33%",
        }}
        description={[
          "Reach out for membership questions, scheduling details, event inquiries, or general community support.",
          "Our team responds quickly and can point you to the right person.",
        ]}
        actions={[
          { label: "Email mekorhabracha@gmail.com", href: "mailto:mekorhabracha@gmail.com" },
          { label: "Call (215) 525-4246", href: "tel:+12155254246" },
        ]}
      />

      <SectionCard className={styles.bannerCard}>
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

      <SectionCard title="Contact Details">
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

      <SectionCard title="Send a Message">
        <ContactForm sourcePath={PATH} />
      </SectionCard>

      <SectionCard title="Visit the Shul">
        <div className={styles.mapShell}>
          <iframe
            src={MAP_EMBED_SRC}
            title="Mekor Habracha location map"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className={styles.mapFrame}
          />
        </div>
      </SectionCard>

      <SectionCard title="Quick Links">
        <CTACluster
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
