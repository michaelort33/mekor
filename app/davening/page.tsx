import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { CTACluster, HeroSection, SectionCard } from "@/components/marketing/primitives";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import styles from "./page.module.css";

const PATH = "/davening" as const;
const MINYAN_WHATSAPP_URL = "https://chat.whatsapp.com/INZrPssTZeHK5xrx5ghECF";

const DAVENING_IMAGES = {
  hero: "/images/davening/hero.jpg",
  banner: "/images/davening/banner.jpg",
} as const;

const SHABBAT_SERVICES = [
  {
    title: "Friday Evening",
    details: [
      "Mincha / Kabbalat Shabbat / Ma'ariv",
      "Summer: 7:00 PM",
      "Winter: around candle-lighting",
    ],
    note: "RSVP by Friday afternoon is appreciated, but you can still come even without RSVP.",
  },
  {
    title: "Shabbat Morning",
    details: ["Shacharit: 9:15 AM", "Hot Kiddush around 11:30 AM"],
    note: "Visitors are always welcome.",
  },
  {
    title: "Shabbat Afternoon",
    details: [
      "Shabbat class: ~30 min before Mincha (summer)",
      "Mincha + Seudah Shlishit: ~30 min before sundown",
      "Early Mincha (winter only): 12:20 PM after Kiddush",
    ],
    note: "Early Mincha is in addition to the later Mincha before sundown.",
  },
] as const;

const WEEKDAY_SHACHARIT = [
  "Sunday: 8:30 AM (followed by BLT: Bagels, Lox, and Torah)",
  "Mon / Thu / Rosh Chodesh / Fast days: 6:45 AM",
  "Tue / Wed / Fri: 6:55 AM",
  "Major secular holidays: 8:30 AM",
] as const;

const WEEKDAY_EVENING = [
  "Summer: Mincha followed by Ma'ariv around 15 minutes before sunset",
  "Winter: Ma'ariv only at 6:30 PM",
  "Weekday Mincha/Ma'ariv runs when there is sufficient interest",
] as const;

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath(PATH);
  return buildDocumentMetadata(document);
}

export default async function DaveningPage() {
  const document = await getNativeDocumentByPath(PATH);

  if (!document) {
    notFound();
  }

  return (
    <MarketingPageShell currentPath={PATH} className={styles.page} contentClassName={styles.stack}>
      <HeroSection
        eyebrow="Services"
        title="Davening at Mekor"
        subtitle="Shabbat and weekday minyanim in Center City"
        image={{
          src: DAVENING_IMAGES.hero,
          alt: "Mekor sanctuary during davening",
          objectFit: "cover",
          objectPosition: "50% 38%",
        }}
        description={[
          "Service times vary seasonally. Weekday and Friday evening participation is coordinated with the minyan group.",
          "Join the WhatsApp thread and email us to help confirm attendance so every tefillah can run smoothly.",
        ]}
        actions={[
          { label: "Join Minyan WhatsApp", href: MINYAN_WHATSAPP_URL },
          { label: "Email admin@mekorhabracha.org", href: "mailto:admin@mekorhabracha.org" },
        ]}
      />

      <SectionCard className={styles.bannerCard}>
        <Image
          src={DAVENING_IMAGES.banner}
          alt="Decorative davening schedule banner"
          loading="lazy"
          className={styles.bannerImage}
          width={1366}
          height={241}
          sizes="(max-width: 768px) 100vw, 1200px"
        />
        <div className={styles.bannerBody}>
          <p className={styles.bannerTitle}>Weekly Schedule Updates</p>
          <p className={styles.bannerText}>
            Exact zmanim can shift each week. For the most current service timing, use the minyan WhatsApp and email
            confirmation.
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Shabbat Services">
        <div className={styles.scheduleGrid}>
          {SHABBAT_SERVICES.map((service) => (
            <article key={service.title} className={styles.scheduleCard}>
              <h3>{service.title}</h3>
              <ul>
                {service.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
              <p>{service.note}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Weekday Services" description="Please notify us if you plan to attend weekday minyanim.">
        <div className={styles.weekdayGrid}>
          <article className={styles.weekdayCard}>
            <h3>Shacharit</h3>
            <ul>
              {WEEKDAY_SHACHARIT.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </article>
          <article className={styles.weekdayCard}>
            <h3>Mincha / Ma&apos;ariv</h3>
            <ul>
              {WEEKDAY_EVENING.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </article>
        </div>
        <p className={styles.noteText}>
          Weekday morning and evening services are often followed by a brief halachic insight from Rabbi Hirsch or
          Rabbi Gotlib. Amud Yomi follows most morning services.
        </p>
      </SectionCard>

      <SectionCard title="Nearby Weekday Minyanim">
        <CTACluster
          items={[
            { label: "Orthodox Community at Penn (Hillel)", href: "https://pennhillel.org/program/orthodox-community-at-penn/" },
            { label: "Penn OCP Minyan Schedule", href: "https://www.pennocp.org/minyan/" },
            { label: "Mikveh Israel Synagogue", href: "https://www.mikvehisrael.org/" },
            { label: "Bnai Abraham Chabad", href: "https://www.phillyshul.com/" },
            { label: "Lower Merion Synagogue", href: "https://www.lowermerionsynagogue.org/" },
            { label: "Young Israel of the Main Line", href: "https://www.yiml.org/" },
          ]}
        />
      </SectionCard>

      <SectionCard title="Participate in Davening" className={styles.participateCard}>
        <p className={styles.noteText}>
          Interested in leining Torah or Haftorah, leading davening, or adding a yahrzeit? Reach out and we will help
          coordinate.
        </p>
        <CTACluster
          items={[
            { label: "Sign up by Email", href: "mailto:admin@mekorhabracha.org?subject=Davening%20Participation" },
            { label: "Call (215) 525-4246", href: "tel:+12155254246" },
            { label: "View Events Calendar", href: "/events" },
          ]}
        />
      </SectionCard>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
