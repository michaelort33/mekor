import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { CTACluster, HeroSection, SectionCard, SplitMediaText } from "@/components/marketing/primitives";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import styles from "./page.module.css";

const PATH = "/kiddush" as const;
const PAYPAL_SPONSOR_URL = "https://www.paypal.com/ncp/payment/C5ZNZELMHX2A4";

const KIDDUSH_IMAGES = {
  hero: "/images/kiddush/hero.jpeg",
  community: "/images/kiddush/community.jpg",
} as const;

const SPONSOR_OPTIONS = [
  {
    title: "Shabbat & Yom Tov Kiddush",
    rate: "$295 member · $360 non-member",
    body: "Celebrate simchas with your Mekor community by sponsoring a Shabbat Kiddush. Whether you're marking a special anniversary, a new baby, graduation, or honoring the memory of someone impactful in your life, a Kiddush sponsorship is a meaningful way to bring people together.",
  },
  {
    title: "Birthday Kiddush",
    rate: "$36",
    body: "Let's celebrate our shul birthdays every month with Birthday Kiddush. Sponsor Kiddush in honor of your loved one's birthday month. Special birthday treats will be served, and singing may occur.",
  },
  {
    title: "Third Meal Sponsorship",
    rate: "$100 member · $125 non-member",
    body: "Join us in making the Shabbat experience complete by sponsoring our beloved Third Meal. Served between Mincha and Maariv, Seudah Shlishit is a time for community, singing, and words of Torah as we savor the last moments of Shabbat together.",
  },
  {
    title: "Bagel Brunch Kiddush",
    rate: "$720 member · $775 non-member",
    body: "Our Bagel Brunch Kiddush features the standard Shabbat Kiddush spread, plus a delicious assortment of fresh bagels, a lox and whitefish tray, tuna and egg salads, cheeses, cream cheese, and a tomato-and-onion tray.",
  },
] as const;

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath(PATH);
  return buildDocumentMetadata(document);
}

export default async function KiddushPage() {
  const document = await getNativeDocumentByPath(PATH);

  if (!document) {
    notFound();
  }

  return (
    <MarketingPageShell currentPath={PATH} className={styles.page} contentClassName={styles.stack}>
      <HeroSection
        eyebrow="Support Mekor"
        title="Sponsor a Kiddush"
        subtitle="Bring community together in celebration"
        image={{
          src: KIDDUSH_IMAGES.hero,
          alt: "Kiddush gathering at Mekor Habracha",
          objectFit: "cover",
          objectPosition: "center center",
        }}
        description={[
          "Sponsoring a Kiddush is a meaningful way to bring our community together in celebration and fellowship.",
          "Whether you're marking a special occasion, honoring a loved one, or commemorating a yahrtzeit, your sponsorship helps us create a warm and welcoming Shabbat experience for all.",
        ]}
        actions={[
          { label: "Sponsor via PayPal", href: PAYPAL_SPONSOR_URL },
          { label: "General Donations", href: "/donations" },
        ]}
      />

      <SectionCard title="Kiddush Sponsorship Options">
        <div className={styles.optionGrid}>
          {SPONSOR_OPTIONS.map((option) => (
            <article className={styles.optionCard} key={option.title}>
              <p className={styles.optionTitle}>{option.title}</p>
              <p className={styles.optionRate}>{option.rate}</p>
              <p className={styles.optionBody}>{option.body}</p>
              <a href={PAYPAL_SPONSOR_URL} target="_blank" rel="noreferrer noopener" className={styles.optionAction}>
                Sponsor now
              </a>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard>
        <SplitMediaText
          title="Make a Kiddush Sponsorship"
          kicker="Celebrate and Honor"
          media={{
            src: KIDDUSH_IMAGES.community,
            alt: "Community celebration table",
            objectFit: "cover",
            objectPosition: "center center",
          }}
          paragraphs={[
            "Your sponsorship helps provide a warm and welcoming environment for our community to connect, reflect, and share in the joy of Shabbat.",
            "Please note: You can send payment via Venmo, PayPal, or through this website.",
            "For Birthday Kiddush, please make sure to tell us the exact birth date of the person you are celebrating.",
          ]}
          links={[
            { label: "Sponsor via PayPal", href: PAYPAL_SPONSOR_URL },
            { label: "Donate via Venmo", href: "https://www.venmo.com/u/Mekor-Habracha" },
            { label: "Contact the Shul Office", href: "mailto:admin@mekorhabracha.org?subject=Kiddush%20Sponsorship" },
          ]}
        />
      </SectionCard>

      <SectionCard title="Quick Links">
        <CTACluster
          items={[
            { label: "Sponsor The Kiddush", href: PAYPAL_SPONSOR_URL },
            { label: "General Donation Page", href: "/donations" },
            { label: "Email: admin@mekorhabracha.org", href: "mailto:admin@mekorhabracha.org" },
            { label: "Call: (215) 525-4246", href: "tel:+12155254246" },
          ]}
        />
      </SectionCard>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
