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
  hero: "/images/visit-us/hero.jpg",
  banner: "/images/visit-us/banner.jpg",
  whatsappEvents: "/images/visit-us/whatsapp-events.png",
  whatsappMeals: "/images/visit-us/whatsapp-meals.png",
  whatsappGeneral: "/images/visit-us/whatsapp-general.png",
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
        eyebrow="Center City Synagogue"
        title="Visit Us"
        subtitle="Services, classes, and community programs in the heart of Philadelphia"
        className={styles.heroFlat}
        image={{
          src: VISIT_IMAGES.hero,
          alt: "Mekor Habracha synagogue interior",
          objectFit: "cover",
          objectPosition: "50% 34%",
        }}
        description={[
          "Contact us if this is your first visit and we will help you get oriented.",
          "We welcome members, out-of-town guests, and anyone looking for a warm Orthodox community in Center City.",
        ]}
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

      <SectionCard title="Location and Contact" className={`${styles.flatSection} ${styles.contactSection}`}>
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
          <iframe
            src={MAP_EMBED_SRC}
            title="Mekor Habracha location map"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className={styles.mapFrame}
          />
        </div>
      </SectionCard>

      <SectionCard title="Send Us a Message" className={`${styles.flatSection} ${styles.messageSection}`}>
        <ContactForm sourcePath={PATH} />
      </SectionCard>

      <SectionCard
        className={`${styles.flatSection} ${styles.whatsAppSection}`}
        title="Mekor Community WhatsApp"
        description="Click the WhatsApp logo to join one of our community groups. Whether you're looking for social events, meal matching, general chats, or updates on minyanim, there's a group for you."
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
            { label: "Latest Newsletters", href: "https://us2.campaign-archive.com/home/?u=f9fe87a16c42c24704c099073&id=94f3350887" },
          ]}
        />
      </SectionCard>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
