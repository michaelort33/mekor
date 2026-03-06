import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { CTACluster, HeroSection, SectionCard, SplitMediaText } from "@/components/marketing/primitives";
import { DonationCheckoutForm } from "@/components/payments/donation-checkout-form";
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
    brand: "stripe" as const,
  },
  {
    label: "Venmo",
    detail: "@Mekor-Habracha",
    href: "https://www.venmo.com/u/Mekor-Habracha",
    brand: "venmo" as const,
  },
  {
    label: "PayPal Giving Fund",
    detail: "Tax-efficient PayPal channel",
    href: "https://www.paypal.com/donate/?hosted_button_id=KUJ7EXBZP4MHC",
    brand: "paypal" as const,
  },
  {
    label: "PayPal Checkout",
    detail: "One-time checkout flow",
    href: "https://www.paypal.com/ncp/payment/C5ZNZELMHX2A4",
    brand: "paypal" as const,
  },
  {
    label: "Zelle",
    detail: "mekorhabracha@gmail.com",
    href: "mailto:mekorhabracha@gmail.com",
    brand: "zelle" as const,
  },
] as const;

function PaymentIcon({ brand }: { brand: string }) {
  if (brand === "stripe") {
    return (
      <svg viewBox="0 0 24 24" className={styles.methodIcon} aria-hidden="true">
        <path d="M13.98 11.37c0-1.07-.52-1.91-2.32-1.91a8.1 8.1 0 0 0-2.54.48l-.4-2.46a10.5 10.5 0 0 1 3.32-.55c3.54 0 4.68 1.82 4.68 4.38v6.64h-2.68l-.18-1.05c-.78.84-1.84 1.23-3.04 1.23-2.04 0-3.32-1.24-3.32-3.04 0-2.18 1.72-3.14 4.68-3.14h1.8v-.58Zm0 2.44h-1.4c-1.48 0-2.04.42-2.04 1.16 0 .6.42 1.02 1.22 1.02 1 0 2.02-.56 2.22-1.6v-.58Z" />
      </svg>
    );
  }
  if (brand === "venmo") {
    return (
      <svg viewBox="0 0 24 24" className={styles.methodIcon} aria-hidden="true">
        <path d="M19.1 4c.5.82.73 1.67.73 2.74 0 3.42-2.92 7.85-5.29 10.96H9.42L7.5 4.63l4-.38.99 7.97c.92-1.5 2.06-3.86 2.06-5.48 0-1.01-.18-1.7-.43-2.25L19.1 4Z" />
      </svg>
    );
  }
  if (brand === "paypal") {
    return (
      <svg viewBox="0 0 24 24" className={styles.methodIcon} aria-hidden="true">
        <path d="M7.02 21.28 7.54 18h-.9l-1.5 9.5h.9l.58-3.72h.02c.32-.56.86-1 1.56-1 1.04 0 1.5.7 1.5 1.72 0 .18-.02.38-.06.56l-.62 3.94h.9l.62-3.96c.04-.2.06-.42.06-.64 0-1.44-.82-2.32-2.12-2.32-.84 0-1.44.34-1.86.9l-.1-.1.5-3.6Zm6.16-1.46c-2.02 0-3.14 1.82-3.14 3.76 0 1.38.82 2.42 2.3 2.42 1.16 0 2-.52 2.56-1.06l-.44-.62c-.48.42-1.14.86-2.02.86-1.02 0-1.56-.68-1.56-1.66h4.32c.06-.24.1-.52.1-.82 0-1.56-.86-2.88-2.12-2.88Zm-1.04 1.56c.9 0 1.42.64 1.42 1.48h-3.5c.18-1.02.98-1.48 2.08-1.48Z"
          transform="translate(-2 -13)" />
        <path d="M18.42 4.57c-.62-.7-1.74-1.07-3.22-1.07H10.7a.64.64 0 0 0-.63.54L8.23 15.3a.38.38 0 0 0 .38.44h2.76l.7-4.4-.02.14a.64.64 0 0 1 .63-.54h1.31c2.57 0 4.58-1.04 5.17-4.06.02-.09.03-.18.04-.26.18-1.12 0-1.88-.58-2.57l-.2-.48Z" />
      </svg>
    );
  }
  if (brand === "zelle") {
    return (
      <svg viewBox="0 0 24 24" className={styles.methodIcon} aria-hidden="true">
        <path d="M13.56 7.44h4.58v1.64l-5.96 7.84h6.12v1.64H6.4V17l6-7.92H6.84V7.44h6.72Z" />
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18.4a8.4 8.4 0 1 1 0-16.8 8.4 8.4 0 0 1 0 16.8Z" fillOpacity="0.3" />
      </svg>
    );
  }
  return null;
}

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
              className={`${styles.methodCard} ${styles[`method--${method.brand}`] ?? ""}`}
            >
              <span className={styles.methodIconWrap}>
                <PaymentIcon brand={method.brand} />
              </span>
              <span className={styles.methodBody}>
                <span className={styles.methodTitle}>{method.label}</span>
                <span className={styles.methodDetail}>{method.detail}</span>
              </span>
            </a>
          ))}
        </div>
        <p className={styles.copyText}>
          By check: make checks payable to <strong>Mekor Habracha</strong> and mail to{" "}
          <strong>1500 Walnut St #206, Philadelphia, PA 19102</strong>, c/o Ellen Geller.
        </p>
      </SectionCard>

      <SectionCard tone="blue">
        <DonationCheckoutForm
          title="Donate inside Mekor"
          description="This intake flow keeps the donation purpose explicit, preserves donor details for receipts, and standardizes classification across sources."
          defaultAmountCents={3600}
          defaultDesignation="General donation"
          returnPath="/donations"
        />
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

      <SectionCard tone="blue" className={styles.affiliateCard}>
        <div className={styles.affiliateContent}>
          <div className={styles.affiliateText}>
            <h2 className={styles.affiliateHeading}>Support Mekor while buying wine and Judaica!</h2>
            <p className={styles.affiliateDescription}>
              Use the Mekor-specific links below when ordering from Kosherwine.com and Judaica.com, and Mekor will earn <strong>5% back</strong> on every purchase. It costs you nothing extra.
            </p>
          </div>
          <div className={styles.affiliateButtons}>
            <a href="https://tinyurl.com/mekorwine" target="_blank" rel="noreferrer noopener" className={styles.affiliateButton}>
              <span className={styles.affiliateButtonIcon}>🍷</span>
              <span className={styles.affiliateButtonBody}>
                <span className={styles.affiliateButtonLabel}>Shop Wine</span>
                <span className={styles.affiliateButtonUrl}>tinyurl.com/mekorwine</span>
              </span>
            </a>
            <a href="https://tinyurl.com/mekorjudaica" target="_blank" rel="noreferrer noopener" className={styles.affiliateButton}>
              <span className={styles.affiliateButtonIcon}>✡️</span>
              <span className={styles.affiliateButtonBody}>
                <span className={styles.affiliateButtonLabel}>Shop Judaica</span>
                <span className={styles.affiliateButtonUrl}>tinyurl.com/mekorjudaica</span>
              </span>
            </a>
          </div>
        </div>
      </SectionCard>

      <SectionCard className={styles.stripeCard}>
        <div className={styles.stripePromo}>
          <div className={styles.stripePromoText}>
            <h2 className={styles.stripePromoHeading}>Donate by Card</h2>
            <p className={styles.copyText}>
              Make a secure one-time or recurring donation with Credit Card, ACH bank transfer, or Apple Pay through Stripe.
            </p>
          </div>
          <a href={STRIPE_DONATION_URL} target="_blank" rel="noreferrer noopener" className={styles.stripeButton}>
            Donate Now via Stripe →
          </a>
        </div>
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
