import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CalendarHeart, HandCoins, ShieldCheck } from "lucide-react";

import { KiddushSponsorshipForm } from "@/components/forms/kiddush-sponsorship-form";
import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { CTACluster, HeroSection, InlineLink, SectionCard, SplitMediaText } from "@/components/marketing/primitives";
import { KiddushPaymentSection, type KiddushOption } from "@/components/payments/kiddush-payment-section";
import { KIDDUSH_LINK } from "@/lib/navigation/site-menu";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import styles from "./page.module.css";

const PATH = KIDDUSH_LINK.href;
const PAYPAL_SPONSOR_URL = "https://www.paypal.com/ncp/payment/C5ZNZELMHX2A4";

const KIDDUSH_IMAGES = {
  hero: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/90e3feecd6e165adbd59c0523a4f1c72657f9b6e-hero.jpeg",
  community: "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/edd73d057d7ebf02932f1b4e196a543067a018ea-community.jpg",
} as const;

const HERO_HIGHLIGHTS = [
  { icon: HandCoins, title: "Four ways to sponsor", detail: "From a $36 birthday to a full bagel brunch" },
  { icon: ShieldCheck, title: "Secure checkout", detail: "Pay by card via Stripe, Venmo, or PayPal" },
  { icon: CalendarHeart, title: "Simchas and yahrtzeits", detail: "Celebrate a simcha or honor someone’s memory" },
] as const;

const SPONSOR_OPTIONS: readonly KiddushOption[] = [
  {
    title: "Kiddush Sponsorship",
    tagline: "Most popular",
    featured: true,
    icon: "kiddush",
    rates: [
      { id: "member", label: "Member", amountCents: 29500 },
      { id: "non-member", label: "Non-member", amountCents: 36000 },
    ],
    body: "Celebrate simchas with your Mekor community or commemorate a yahrtzeit by sponsoring a Shabbat Kiddush. Whether you’re marking a special anniversary, a new baby, a graduation, or honoring the memory of someone impactful in your life, a Kiddush sponsorship is a meaningful way to bring people together.",
  },
  {
    title: "Birthday Kiddush",
    icon: "birthday",
    rates: [{ id: "flat", label: "Flat sponsorship", amountCents: 3600 }],
    body: "Let’s celebrate our shul birthdays every month with Birthday Kiddush! Sponsor Kiddush in honor of your loved one’s birthday month. Special birthday treats will be served (and singing may occur).",
    when: "Every 3rd Shabbat of the month",
    note: "Add the exact birth date in the dedication field so we can celebrate on the right week.",
  },
  {
    title: "Third Meal (Seudah Shlishit)",
    icon: "thirdMeal",
    rates: [
      { id: "member", label: "Member", amountCents: 10000 },
      { id: "non-member", label: "Non-member", amountCents: 12500 },
    ],
    body: "Join us in making the Shabbat experience complete by sponsoring our beloved Third Meal. Served between Mincha and Maariv, Seudah Shlishit is a time for community, singing, and words of Torah as we savor the last moments of Shabbat together. A typical menu includes fresh bagels or rolls, tuna and egg salads, cream cheese, spreads, and light refreshments. Your sponsorship helps create a warm, welcoming atmosphere for all.",
  },
  {
    title: "Bagel Brunch Kiddush",
    icon: "bagelBrunch",
    rates: [
      { id: "member", label: "Member", amountCents: 72000 },
      { id: "non-member", label: "Non-member", amountCents: 77500 },
    ],
    body: "Our Bagel Brunch Kiddush features the standard Shabbat Kiddush spread, plus a delicious assortment of fresh bagels, a lox and whitefish tray, tuna and egg salads, cheeses, cream cheese, and a tomato-and-onion tray. A perfect way to enjoy good food, good company, and the joy of Shabbat together.",
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
        subtitle="For a simcha or yahrtzeit"
        className={styles.heroFlat}
        image={{
          src: KIDDUSH_IMAGES.hero,
          alt: "Kiddush gathering at Mekor Habracha",
          objectFit: "cover",
          objectPosition: "center center",
        }}
        description={[
          "Celebrate simchas with your Mekor community or commemorate a yahrtzeit by sponsoring a Shabbat Kiddush.",
          "Whether you’re marking a special anniversary, a new baby, a graduation, or honoring the memory of someone impactful in your life, a Kiddush sponsorship is a meaningful way to bring people together.",
        ]}
        actions={[
          { label: "Choose a sponsorship", href: "#kiddush-payment" },
          { label: "Pay with PayPal", href: PAYPAL_SPONSOR_URL },
        ]}
      />

      <ul className={styles.highlightRow}>
        {HERO_HIGHLIGHTS.map((highlight) => {
          const Icon = highlight.icon;
          return (
            <li className={styles.highlightCard} key={highlight.title}>
              <span className={styles.highlightIcon} aria-hidden="true">
                <Icon strokeWidth={1.8} />
              </span>
              <span className={styles.highlightCopy}>
                <span className={styles.highlightTitle}>{highlight.title}</span>
                <span className={styles.highlightDetail}>{highlight.detail}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <KiddushPaymentSection options={SPONSOR_OPTIONS} returnPath={PATH} />

      <SectionCard className={`${styles.flatSection} ${styles.mediaSection}`}>
        <SplitMediaText
          title="Sponsor The Kiddush"
          kicker="Kiddush Sponsorship"
          media={{
            src: KIDDUSH_IMAGES.community,
            alt: "Community celebration table",
            objectFit: "cover",
            objectPosition: "center center",
          }}
          paragraphs={[
            "Your sponsorship helps provide a warm and welcoming environment for our community to connect, reflect, and share in the joy of Shabbat.",
            <>
              You can send payment through <InlineLink href="https://www.venmo.com/u/Mekor-Habracha">Venmo</InlineLink>, <InlineLink href={PAYPAL_SPONSOR_URL}>PayPal</InlineLink>, or the <InlineLink href="#kiddush-payment">sponsorship form on this page</InlineLink>. Contact the <InlineLink href="mailto:admin@mekorhabracha.org?subject=Kiddush%20Sponsorship">shul office</InlineLink> with any questions.
            </>,
            "For Birthday Kiddush, please make sure to tell us the exact birth date of the person you are celebrating.",
          ]}
        />
      </SectionCard>

      <SectionCard
        title="Request a Kiddush Sponsorship"
        description="Send the sponsorship details here so the office can confirm the date, dedication, and payment plan with you."
        className={styles.flatSection}
      >
        <KiddushSponsorshipForm sourcePath={PATH} />
      </SectionCard>

      <SectionCard title="Quick Links" className={styles.flatSection}>
        <CTACluster
          items={[
            { label: "Choose a sponsorship", href: "#kiddush-payment" },
            { label: "Pay with PayPal", href: PAYPAL_SPONSOR_URL },
            { label: "General donations", href: "/donations" },
            { label: "Email: admin@mekorhabracha.org", href: "mailto:admin@mekorhabracha.org" },
            { label: "Call: (215) 525-4246", href: "tel:+12155254246" },
          ]}
        />
      </SectionCard>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
