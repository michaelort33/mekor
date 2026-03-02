import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

import { CTACluster, HeroSection, SectionCard } from "@/components/marketing/primitives";
import { MarketingPageShell } from "@/components/marketing/page-shell";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import styles from "./page.module.css";

const PATH = "/membership" as const;

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath(PATH);
  return buildDocumentMetadata(document);
}

export default async function MembershipPage() {
  const document = await getNativeDocumentByPath(PATH);

  if (!document) {
    notFound();
  }

  return (
    <MarketingPageShell currentPath={PATH} contentClassName={styles.content}>
      <HeroSection
        title="Join Mekor Habracha!"
        subtitle="Membership in Mekor Habracha"
        description={[
          "We offer 2 simple ways to join or renew and become part of a synagogue community that keeps Jewish life vibrant in Center City.",
          "Choose from annual membership options below and connect directly for payment support.",
        ]}
      />

      <SectionCard title="Membership Categories & Rates">
        <p className={styles.intro}>Year 5786 (2025-2026) Membership Rates for new and renewing members:</p>
        <div className={styles.rateGrid}>
          {[
            ["Single Membership", "$1000", "Until Rosh Hashana 5786"],
            ["Couple/Family Membership", "$2,000", "Until Rosh Hashana 5786"],
            ["Student Membership", "$500", "Until Rosh Hashana 5786"],
          ].map((row) => (
            <article className={styles.rateCard} key={row[0]}>
              <p className={styles.rateTitle}>{row[0]}</p>
              <p className={styles.rateAmount}>{row[1]}</p>
              <p className={styles.rateTerm}>{row[2]}</p>
              <a
                href="https://fs3.formsite.com/PrCyQq/kjkfhhvneh/index"
                target="_blank"
                rel="noreferrer noopener"
                className={styles.inlineAction}
              >
                Join now
              </a>
            </article>
          ))}
        </div>
        <p className={styles.note}>
          We also request a suggested donation of <strong>$100</strong> as a security fee.
        </p>
        <p className={styles.note}>
          Auxiliary Membership rates are available for those living outside Center City Philadelphia.{" "}
          <Link href="/auxiliary-membership">Please click here for info</Link>.
        </p>
        <p className={styles.note}>
          If you joined during the year and paid for a full year, your following year&apos;s dues will
          be prorated.
        </p>
      </SectionCard>

      <SectionCard title="Why Join?">
        <p className={styles.leadText}>
          We try to make everyone, member &amp; nonmember alike, feel welcome in our community.
          Visitors to our shul speak glowingly about the way we assist them in so many ways.
        </p>
        <p className={styles.bodyText}>
          Mekor Habracha cannot exist and provide so many services without paying members and the
          generosity of donors. The Center City Jewish life that you enjoy depends on Mekor Habracha,
          and Mekor Habracha depends on membership dues. When you join, you become part of a shul
          community that is committed to its loyal members.
        </p>
      </SectionCard>

      <SectionCard title="Benefits of Membership">
        <p className={styles.sectionLead}>Here&apos;s a partial list of how Mekor contributes to community life:</p>
        <ul className={styles.bulletList}>
          <li>A warm, inviting community that welcomes people of all ages &amp; levels of observance.</li>
          <li>Shabbat, holiday, and weekday services for you and visiting family.</li>
          <li>Shabbat and Yom Tov Kiddushim.</li>
          <li>Community Shabbat &amp; Yom Tov meals.</li>
          <li>Special programming and holiday festivities for both children and adults.</li>
          <li>Torah study and classes at all levels, from beginner to advanced.</li>
          <li>Halachic, spiritual, and life guidance.</li>
          <li>And the countless other ways Mekor Habracha enriches Jewish life.</li>
        </ul>
        <p className={styles.sectionLead}>Special member benefits include:</p>
        <ul className={styles.bulletList}>
          <li>Free High Holiday seats &amp; discounted guest rates.</li>
          <li>Meaningful Jewish-oriented children&apos;s programming.</li>
          <li>Community support for life-cycle events and shared moments.</li>
          <li>Discounts on Kiddush sponsorships and private event rentals.</li>
          <li>And much, much more.</li>
        </ul>
      </SectionCard>

      <SectionCard title="How to Join or Renew">
        <p className={styles.bodyText}>
          Use our form or email us directly. Please tell us if you are renewing or joining for the first
          time and include your preferred membership type and payment method (Venmo, PayPal, personal
          check, etc.).
        </p>
        <div className={styles.actionRow}>
          <a href="https://fs3.formsite.com/PrCyQq/kjkfhhvneh/index" target="_blank" rel="noreferrer noopener" className={styles.actionButton}>
            Use membership form
          </a>
          <a href="mailto:mekorhabracha@gmail.com?subject=Membership%20Question" className={styles.actionButton}>
            Email us
          </a>
        </div>
        <p className={styles.note}>
          We never turn anyone away for lack of funds. If you need a payment plan or reduction, call
          {" "}
          <a href="tel:+12155254246">(215) 525-4246</a> or email the shul.
        </p>
      </SectionCard>

      <SectionCard title="Contact Us">
        <CTACluster
          items={[
            { label: "Call", href: "tel:+12155254246" },
            { label: "Email", href: "mailto:admin@mekorhabracha.org?subject=Join%20Us" },
            {
              label: "Open map",
              href: "https://maps.google.com/?q=1500+Walnut+St+Suite+206+Philadelphia+PA+19102",
              description:
                "Mekor Habracha Center City Synagogue, 1500 Walnut St Suite 206, Philadelphia, PA 19102",
            },
          ]}
        />
      </SectionCard>
    </MarketingPageShell>
  );
}
