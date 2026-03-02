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
    body: "Sponsor a regular Kiddush to celebrate a simcha, honor a loved one, or mark a yahrtzeit with the Mekor community.",
  },
  {
    title: "Birthday Kiddush",
    rate: "$36",
    body: "Celebrate monthly birthdays on the 3rd Shabbat of each month with special treats and birthday singing.",
  },
  {
    title: "Third Meal Sponsorship",
    rate: "$100 member · $125 non-member",
    body: "Support Seudah Shlishit between Mincha and Maariv with a welcoming spread and a warm communal atmosphere.",
  },
  {
    title: "Bagel Brunch Kiddush",
    rate: "$720 member · $775 non-member",
    body: "Upgrade Kiddush with bagels, fish, salads, cheeses, and expanded brunch options for the whole community.",
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
          "Sponsoring a Kiddush is a meaningful way to celebrate, honor, and remember with your Mekor community.",
          "Your support helps create a warm Shabbat environment where people connect in fellowship and joy.",
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
            "Whether you are marking an anniversary, a new baby, a graduation, or a memorial, sponsorship is a meaningful contribution to Jewish life in Center City.",
            "You can send payment via PayPal, Venmo, or through the website donation channels.",
            "For Birthday Kiddush, please include the exact birth date of the person you are celebrating.",
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
