import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { ContactForm } from "@/components/medium-pages/contact-form";
import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { CTACluster, HeroSection, SectionCard } from "@/components/marketing/primitives";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import styles from "./page.module.css";

const PATH = "/visit-us" as const;

const VISIT_IMAGES = {
  hero: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/8f6095dacde5336ede21eca03b236b3baee040f1-hero.jpg",
  banner: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/1542981618300378c703655bb10fbc519923d5e9-banner.jpg",
  whatsappEvents: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/915aeb7071de260567891a7ece51652cc01437da-whatsapp-events.png",
  whatsappMeals: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/8467762674698ddbb735746a2586fc79330efe1a-whatsapp-meals.png",
  whatsappGeneral: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/e9e5b6ede6ab71e08d23509ded949d4e09ef8938-whatsapp-general.png",
} as const;

const MAP_EMBED_SRC =
  "https://www.google.com/maps?q=1500+Walnut+St+Suite+206+Philadelphia+PA+19102&output=embed";

const WHATSAPP_GROUPS = [
  {
    title: "Community Updates",
    description: "General chats and community updates to help you stay connected with what is happening in the shul and neighborhood.",
    href: "https://chat.whatsapp.com/G7JTiUN3aPN1V09lbBLC7G",
    icon: VISIT_IMAGES.whatsappGeneral,
  },
  {
    title: "Social and Events",
    description: "Social events and community happenings for people looking to connect beyond services and classes.",
    href: "https://chat.whatsapp.com/G7JTiUN3aPN1V09lbBLC7G",
    icon: VISIT_IMAGES.whatsappEvents,
  },
  {
    title: "Meal Matching and Hospitality",
    description: "Meal matching, hospitality, and practical coordination for members, guests, and visitors.",
    href: "https://chat.whatsapp.com/G7JTiUN3aPN1V09lbBLC7G",
    icon: VISIT_IMAGES.whatsappMeals,
  },
] as const;

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath(PATH);
  return buildDocumentMetadata(document);
}

export default async function VisitUsPage() {
  const document = await getNativeDocumentByPath(PATH);

  if (!document) {
    notFound();
  }

  return (
    <MarketingPageShell currentPath={PATH} className={styles.page} contentClassName={styles.stack}>
      <HeroSection
        eyebrow="Visit Us"
        title="Visit Us"
        subtitle="Contact US"
        className={styles.heroFlat}
        image={{
          src: VISIT_IMAGES.hero,
          alt: "Mekor Habracha synagogue interior",
          objectFit: "cover",
          objectPosition: "50% 34%",
        }}
        description={["1500 Walnut St, Suite 206", "Philadelphia, PA 19102", "215-525-4246", "admin@mekorhabracha.org"]}
        actions={[
          { label: "Email admin@mekorhabracha.org", href: "mailto:admin@mekorhabracha.org" },
          { label: "Call (215) 525-4246", href: "tel:+12155254246" },
        ]}
      />

      <SectionCard className={`${styles.flatSection} ${styles.bannerCard}`}>
        <Image
          src={VISIT_IMAGES.banner}
          alt="Mekor visitors and members"
          width={1366}
          height={355}
          sizes="(max-width: 768px) 100vw, 1200px"
          className={styles.bannerImage}
          loading="lazy"
        />
      </SectionCard>

      <SectionCard title="Contact US" className={`${styles.flatSection} ${styles.contactSection}`}>
        <div className={styles.contactGrid}>
          <article className={styles.contactCard}>
            <h3>Address</h3>
            <p>Mekor Habracha Center City Synagogue</p>
            <p>1500 Walnut St, Suite 206</p>
            <p>Philadelphia, PA 19102</p>
          </article>
          <article className={styles.contactCard}>
            <h3>Direct Contact</h3>
            <p>
              <a href="tel:+12155254246">(215) 525-4246</a>
            </p>
            <p>
              <a href="mailto:admin@mekorhabracha.org">admin@mekorhabracha.org</a>
            </p>
            <p>
              <a
                href="https://maps.google.com/?q=1500+Walnut+St+Suite+206+Philadelphia+PA+19102"
                target="_blank"
                rel="noreferrer noopener"
              >
                Open in Google Maps
              </a>
            </p>
          </article>
        </div>
      </SectionCard>

      <SectionCard title="Map" className={`${styles.flatSection} ${styles.mapSection}`}>
        <div className={styles.mapShell}>
          {process.env.NODE_ENV === "production" ? (
            <iframe
              src={MAP_EMBED_SRC}
              title="Mekor Habracha location map"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className={styles.mapFrame}
            />
          ) : (
            <div className={styles.mapFrame} aria-hidden />
          )}
        </div>
      </SectionCard>

      <SectionCard title="Contact US" className={`${styles.flatSection} ${styles.messageSection}`}>
        <ContactForm sourcePath={PATH} />
      </SectionCard>

      <SectionCard
        className={`${styles.flatSection} ${styles.whatsAppSection}`}
        title="Mekor Community Whatsapp Group"
        description="Click the WhatsApp logo to join one of our community groups! Whether you're looking for social events, meal matching, general chats, or updates on minyanim, there's a group for you!"
      >
        <div className={styles.whatsAppGrid}>
          {WHATSAPP_GROUPS.map((group) => (
            <a key={group.title} href={group.href} target="_blank" rel="noreferrer noopener" className={styles.groupCard}>
              <Image src={group.icon} alt="" width={36} height={36} className={styles.groupIcon} loading="lazy" />
              <div className={styles.groupBody}>
                <h3>{group.title}</h3>
                <p>{group.description}</p>
              </div>
            </a>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Quick Links" className={`${styles.flatSection} ${styles.quickLinksSection}`}>
        <CTACluster
          className={styles.quickLinksCluster}
          items={[
            { label: "Membership", href: "/membership" },
            { label: "Davening Schedule", href: "/davening" },
            { label: "Events", href: "/events" },
            { label: "Past Newsletters", href: "/newsletters" },
          ]}
        />
      </SectionCard>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
