import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { CTACluster, HeroSection, SectionCard } from "@/components/marketing/primitives";
import { VolunteerForm } from "@/components/volunteer/volunteer-form";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import styles from "./page.module.css";

const PATH = "/team-4" as const;

const VOLUNTEER_IMAGES = {
  hero: "/images/volunteer/hero.jpg",
  banner: "/images/volunteer/banner.jpg",
} as const;

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath(PATH);
  return buildDocumentMetadata(document);
}

const VOLUNTEER_SECTIONS = [
  {
    title: "Kiddush Preparation",
    body: "We are famous for our wonderful kiddush every Shabbat, but it doesn't happen by itself. Thanks to our community volunteers, we enjoy an amazing kiddush week after week. Volunteering to set up kiddush is a great way to give back to the community. Please consider signing up to make cholent before candle lighting or to set up and take down kiddush on Shabbat and Yom Tov.",
    links: [
      { label: "Volunteer by email", href: "mailto:mekorhabracha@gmail.com?subject=Kiddush%20Volunteer" },
      { label: "Kiddush page", href: "/kiddush" },
    ],
  },
  {
    title: "Torah and Haftorah Reading",
    body: "In order to provide the community with quality Torah and haftarah reading, we need capable people from the community to provide this invaluable service. If you know how to read Torah or haftarah and would like to volunteer to lain, we would love to hear some new voices. If you are a little rusty or would like to learn, please reach out.",
    links: [
      { label: "Laining coordinator", href: "mailto:mekorlaining@gmail.com" },
      { label: "General volunteer sign-up", href: "#volunteer-signup" },
    ],
  },
  {
    title: "Meal Train and Shabbat Hospitality",
    body: "Join the Meal Train. Our Meal Train volunteers provide meals to help families who recently had a baby or have undergone some other significant life event. Volunteer to host a meal. The Mekor community is very proud to be able to welcome new members, existing members, and visitors for Shabbat and holiday meals.",
    links: [
      { label: "Hospitality committee", href: "mailto:mekorhospitality@gmail.com" },
      { label: "Request hospitality", href: "mailto:mekorhospitality@gmail.com?subject=Hospitality%20Request" },
    ],
  },
  {
    title: "Eruv Checking and Mashgichim",
    body: "Become an Eruv Checker. If you have a bicycle or car, and you could help out once every 6 weeks or even less often, please sign up. Training will be provided. Become a Volunteer Mashgiach. Our list of Center City kosher establishments keeps expanding, but we rely on volunteers to help in this process. No experience necessary. Rabbi Hirsch will provide onsite training.",
    links: [
      { label: "Eruv (Andres)", href: "mailto:andres.catalan@gmail.com" },
      { label: "Eruv (Jon)", href: "mailto:jzgradman@gmail.com" },
      { label: "Volunteer mashgiach", href: "mailto:mekorhabracha@gmail.com?subject=Volunteer%20Mashgiach" },
    ],
  },
] as const;

export default async function Team4Page() {
  const document = await getNativeDocumentByPath(PATH);

  if (!document) {
    notFound();
  }

  return (
    <MarketingPageShell currentPath={PATH} className={styles.page} contentClassName={styles.stack}>
      <HeroSection
        eyebrow="Community Support"
        title="Volunteer at Mekor"
        subtitle="Help sustain the warmth and energy of our shul"
        image={{
          src: VOLUNTEER_IMAGES.hero,
          alt: "Mekor volunteers and community members",
          objectFit: "cover",
          objectPosition: "50% 32%",
        }}
        description={[
          "From Kiddush and hospitality to laining and eruv support, volunteers keep Mekor running week after week.",
          "Choose one area or several. We welcome all levels of experience and availability.",
        ]}
        actions={[
          { label: "Jump to Volunteer Form", href: "#volunteer-signup" },
          { label: "Email Volunteer Team", href: "mailto:mekorhabracha@gmail.com?subject=Volunteer%20at%20Mekor" },
        ]}
      />

      <SectionCard className={styles.bannerCard}>
        <Image
          src={VOLUNTEER_IMAGES.banner}
          alt="Volunteer sign-up banner"
          width={1366}
          height={355}
          sizes="(max-width: 768px) 100vw, 1200px"
          className={styles.bannerImage}
          loading="lazy"
        />
        <div className={styles.bannerBody}>
          <p className={styles.bannerTitle}>Every Role Strengthens the Community</p>
          <p className={styles.bannerText}>
            A little time from many people creates meaningful impact for members, guests, and families across the year.
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Where You Can Help">
        <div className={styles.sectionGrid}>
          {VOLUNTEER_SECTIONS.map((item) => (
            <article key={item.title} className={styles.sectionCard}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <div className={styles.sectionLinks}>
                {item.links.map((link) => (
                  <a
                    key={`${item.title}-${link.href}`}
                    href={link.href}
                    target={link.href.startsWith("http") ? "_blank" : undefined}
                    rel={link.href.startsWith("http") ? "noreferrer noopener" : undefined}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="A new volunteer opportunity is coming soon...">
        <ol className={styles.stepsList}>
          <li>Look out. This space will contain a new and special volunteer opportunity soon.</li>
          <li>Choose an opportunity in the sign-up form below.</li>
          <li>Share your availability date and contact details.</li>
        </ol>
        <p className={styles.noteText}>
          If you have an upcoming yahrzeit or would like to read Torah or Haftorah on a specific date, mention it in
          the additional notes field.
        </p>
      </SectionCard>

      <SectionCard title="Volunteer Sign-Up" description="Join our team of dedicated volunteers and make a difference." className={styles.formCard}>
        <div id="volunteer-signup" className={styles.formAnchor} />
        <VolunteerForm />
      </SectionCard>

      <SectionCard title="Quick Contacts">
        <CTACluster
          items={[
            { label: "General Volunteer", href: "mailto:mekorhabracha@gmail.com?subject=Volunteer%20at%20Mekor" },
            { label: "Laining", href: "mailto:mekorlaining@gmail.com" },
            { label: "Hospitality / Meal Train", href: "mailto:mekorhospitality@gmail.com" },
            { label: "Call the Shul Office", href: "tel:+12155254246" },
          ]}
        />
      </SectionCard>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
