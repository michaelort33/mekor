import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { CTACluster, HeroSection, SectionCard, SplitMediaText } from "@/components/marketing/primitives";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import styles from "./page.module.css";

const PATH = "/donations" as const;

const DONATION_IMAGES = {
  hero: "/images/donations/hero.jpg",
  support: "/images/donations/support.jpg",
  dedication: "/images/donations/dedication.jpg",
} as const;

const STRIPE_DONATION_URL = "https://donate.stripe.com/3cI6oz9ef0tU8qXdB35Ne00";

const ONLINE_METHODS = [
  {
    label: "Credit / ACH / Apple Pay",
    detail: "Secure Stripe checkout",
    href: STRIPE_DONATION_URL,
  },
  {
    label: "Venmo",
    detail: "@Mekor-Habracha",
    href: "https://www.venmo.com/u/Mekor-Habracha",
  },
  {
    label: "PayPal Giving Fund",
    detail: "Tax-efficient PayPal channel",
    href: "https://www.paypal.com/donate/?hosted_button_id=KUJ7EXBZP4MHC",
  },
  {
    label: "PayPal Checkout",
    detail: "One-time checkout flow",
    href: "https://www.paypal.com/ncp/payment/C5ZNZELMHX2A4",
  },
  {
    label: "Zelle",
    detail: "mekorhabracha@gmail.com",
    href: "mailto:mekorhabracha@gmail.com",
  },
] as const;

const DONATION_OPPORTUNITIES = [
  "Kiddush (Shabbat & Yom Tov) and Third Meal sponsorship ($295 members / $360 non-members)",
  "Plaque on memorial board in the shul sanctuary ($1,000)",
  "Dedication of an Artscroll Siddur ($100), Machzor ($100), or Chumash ($200)",
  "Community dinner sponsorship ($1,800 full / $1,000 half)",
  "Talitot ($1,000 set of 10 / $150 one talit)",
  "Mechitzot (2 available) ($10,000 each)",
  "New Aron Kodesh ($50,000)",
] as const;

const SPACE_DEDICATIONS = [
  "Kitchen ($25,000)",
  "Library ($50,000)",
  "Synagogue Art Exhibit Hall ($20,000)",
  "Children's spaces (2 available, $25,000 each)",
  "Mekor Sanctuary & Event Space ($100,000)",
] as const;

export const dynamic = "force-static";

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath(PATH);
  return buildDocumentMetadata(document);
}

export default async function DonationsPage() {
  const document = await getNativeDocumentByPath(PATH);

  if (!document) {
    notFound();
  }

  return (
    <MarketingPageShell currentPath={PATH} className={styles.page} contentClassName={styles.stack}>
      <HeroSection
        eyebrow="Support Mekor"
        title="How You Can Donate and Help Mekor"
        subtitle="Sustain Jewish life in Center City"
        image={{
          src: DONATION_IMAGES.hero,
          alt: "Community members gathering at Mekor",
          objectFit: "cover",
          objectPosition: "center center",
        }}
        description={[
          "The generosity of members and visitors is vital to our shul and the wider Jewish community in Philadelphia.",
          "Donations are a meaningful way to celebrate milestones, honor loved ones, and keep our community growing.",
        ]}
        actions={[
          { label: "Donate by Credit / ACH / Apple Pay", href: STRIPE_DONATION_URL },
          { label: "Donate with Venmo", href: "https://www.venmo.com/u/Mekor-Habracha" },
          { label: "Donate with PayPal Giving Fund", href: "https://www.paypal.com/donate/?hosted_button_id=KUJ7EXBZP4MHC" },
        ]}
      />

      <SectionCard title="Ways You Can Donate">
        <div className={styles.methodGrid}>
          {ONLINE_METHODS.map((method) => (
            <a
              key={method.label}
              href={method.href}
              target={method.href.startsWith("http") ? "_blank" : undefined}
              rel={method.href.startsWith("http") ? "noreferrer noopener" : undefined}
              className={styles.methodCard}
            >
              <span className={styles.methodTitle}>{method.label}</span>
              <span className={styles.methodDetail}>{method.detail}</span>
            </a>
          ))}
        </div>
        <p className={styles.copyText}>
          By check: make checks payable to <strong>Mekor Habracha</strong> and mail to{" "}
          <strong>1500 Walnut St #206, Philadelphia, PA 19102</strong>, c/o Ellen Geller.
        </p>
      </SectionCard>

      <SectionCard>
        <SplitMediaText
          title="Sponsor and Dedicate"
          kicker="Celebrate and Honor"
          media={{
            src: DONATION_IMAGES.support,
            alt: "Community celebration and sponsorship moment",
            objectFit: "cover",
            objectPosition: "center center",
          }}
          paragraphs={[
            "Celebrate simchas with your Mekor community through Shabbat Kiddush sponsorships and Yom Tov support.",
            "Honor and memorialize impactful people in your life through dedication opportunities throughout the shul.",
            "All contributions are tax-deductible and are acknowledged with a letter for tax purposes.",
          ]}
          links={[
            { label: "Kiddush Donation Page", href: "/kiddush" },
            { label: "Email the Shul Office", href: "mailto:mekorhabracha@gmail.com" },
          ]}
        />
      </SectionCard>

      <SectionCard title="Donation Opportunities">
        <ul className={styles.bulletList}>
          {DONATION_OPPORTUNITIES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className={styles.copyText}>General contributions of any amount are always appreciated.</p>
      </SectionCard>

      <SectionCard>
        <SplitMediaText
          reverse
          title="Building and Space Dedications"
          kicker="Legacy Giving"
          media={{
            src: DONATION_IMAGES.dedication,
            alt: "Hands reaching out in support and community giving",
            objectFit: "cover",
            objectPosition: "center center",
          }}
          paragraphs={[
            "Major dedication opportunities remain available for donors who want to make a long-term impact on Mekor's physical home.",
            SPACE_DEDICATIONS.join(" · "),
          ]}
          links={[
            { label: "Speak with Leadership", href: "mailto:admin@mekorhabracha.org?subject=Dedication%20Opportunity" },
            { label: "Call (215) 525-4246", href: "tel:+12155254246" },
          ]}
        />
      </SectionCard>

      <SectionCard title="Donate by Card (Embedded Stripe Iframe)" className={styles.stripeCard}>
        <p className={styles.copyText}>
          Use the embedded Stripe donation form below for Credit, ACH, and Apple Pay.
        </p>
        <div className={styles.stripeShell}>
          <iframe
            className={styles.stripeFrame}
            src={STRIPE_DONATION_URL}
            title="Mekor donation checkout"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <a href={STRIPE_DONATION_URL} target="_blank" rel="noreferrer noopener" className={styles.stripeFallback}>
          Open Stripe checkout in a new tab
        </a>
      </SectionCard>

      <SectionCard title="Quick Donation Links">
        <CTACluster
          items={[
            { label: "Stripe (Credit / ACH / Apple Pay)", href: STRIPE_DONATION_URL },
            { label: "Venmo", href: "https://www.venmo.com/u/Mekor-Habracha" },
            { label: "PayPal Giving Fund", href: "https://www.paypal.com/donate/?hosted_button_id=KUJ7EXBZP4MHC" },
            { label: "PayPal Checkout", href: "https://www.paypal.com/ncp/payment/C5ZNZELMHX2A4" },
            { label: "Zelle: mekorhabracha@gmail.com", href: "mailto:mekorhabracha@gmail.com" },
          ]}
        />
      </SectionCard>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
