import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { CTACluster, HeroSection, SectionCard } from "@/components/marketing/primitives";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import styles from "./page.module.css";

const PATH = "/our-leadership" as const;

const LEADERSHIP_IMAGES = {
  hero: "/images/leadership/hero.jpg",
  bruce: "/images/leadership/bruce.jpeg",
  ellen: "/images/leadership/ellen.png",
  yoella: "/images/leadership/yoella.jpeg",
  chana: "/images/leadership/chana.jpeg",
  ethan: "/images/leadership/ethan.jpg",
  jonathan: "/images/leadership/jonathan.jpeg",
  david: "/images/leadership/david.jpeg",
} as const;

const LEADERSHIP_MEMBERS = [
  {
    name: "Bruce Taubman",
    role: "President",
    image: LEADERSHIP_IMAGES.bruce,
    bio: "Dr. Bruce Taubman is a pediatrician with a Cherry Hill practice. He has lived in Center City since 1972 and serves as synagogue president.",
  },
  {
    name: "Ellen B. Geller",
    role: "Treasurer",
    image: LEADERSHIP_IMAGES.ellen,
    bio: "Ellen Geller retired in 2020 after years of leadership in medical research organizations and has been a long-standing Center City community member.",
  },
  {
    name: "Yoella Epstein, Esq.",
    role: "Board Member",
    image: LEADERSHIP_IMAGES.yoella,
    bio: "Yoella Epstein is a litigation attorney at Blank Rome LLP and a dedicated builder of Mekor community life with her family.",
  },
  {
    name: "Chana Strauss",
    role: "Board Member",
    image: LEADERSHIP_IMAGES.chana,
    bio: "Chana Strauss is a Midwife and Women's Health Nurse Practitioner at AtlantiCare Regional Medical Center and active Mekor member.",
  },
  {
    name: "Ethan Lewis",
    role: "Board Member",
    image: LEADERSHIP_IMAGES.ethan,
    bio: "Ethan Lewis moved to Center City with his wife Hannah and has served on the Mekor board since 2025.",
  },
  {
    name: "Jonathan Goldstein",
    role: "Board Member",
    image: LEADERSHIP_IMAGES.jonathan,
    bio: "Jonathan Goldstein is an e-commerce specialist and chazzan, deeply involved in communal leadership and member engagement.",
  },
  {
    name: "David Margules",
    role: "Board Member",
    image: LEADERSHIP_IMAGES.david,
    bio: "David Margules is a partner at Ballard Spahr and has served in national and local Jewish leadership roles.",
  },
  {
    name: "Ralph Shapira",
    role: "Board Member",
    image: null,
    bio: "Long-time community supporter and board member.",
  },
] as const;

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath(PATH);
  return buildDocumentMetadata(document);
}

export default async function OurLeadershipPage() {
  const document = await getNativeDocumentByPath(PATH);

  if (!document) {
    notFound();
  }

  return (
    <MarketingPageShell currentPath={PATH} className={styles.page} contentClassName={styles.stack}>
      <HeroSection
        eyebrow="Board and Officers"
        title="Our Leadership"
        subtitle="Committed members guiding Mekor's growth and mission"
        image={{
          src: LEADERSHIP_IMAGES.hero,
          alt: "Mekor leadership team",
          objectFit: "cover",
          objectPosition: "50% 32%",
        }}
        description={[
          "Mekor Habracha's board is composed of volunteers committed to building vibrant Jewish life in Center City.",
          "For board matters, contact us directly and we will respond promptly.",
        ]}
        actions={[
          { label: "Email the Board", href: "mailto:mekorboard@gmail.com" },
          { label: "Meet Our Rabbis", href: "/our-rabbi" },
        ]}
      />

      <SectionCard title="Board Members and Officers">
        <div className={styles.memberGrid}>
          {LEADERSHIP_MEMBERS.map((member) => (
            <article key={member.name} className={styles.memberCard}>
              {member.image ? (
                <Image
                  src={member.image}
                  alt={member.name}
                  width={420}
                  height={420}
                  sizes="(max-width: 768px) 100vw, 280px"
                  className={styles.memberPhoto}
                  loading="lazy"
                />
              ) : (
                <div className={styles.memberPlaceholder} aria-hidden="true">
                  {member.name
                    .split(" ")
                    .map((part) => part.charAt(0))
                    .slice(0, 2)
                    .join("")}
                </div>
              )}
              <div className={styles.memberBody}>
                <h3>{member.name}</h3>
                <p className={styles.memberRole}>{member.role}</p>
                <p>{member.bio}</p>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Contact Leadership">
        <CTACluster
          items={[
            { label: "Board Email", href: "mailto:mekorboard@gmail.com" },
            { label: "General Shul Office", href: "mailto:admin@mekorhabracha.org" },
            { label: "Call (215) 525-4246", href: "tel:+12155254246" },
            { label: "Membership", href: "/membership" },
          ]}
        />
      </SectionCard>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
