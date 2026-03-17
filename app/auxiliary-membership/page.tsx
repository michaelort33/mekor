import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";

import { AuxiliaryMembershipForm } from "@/components/forms/auxiliary-membership-form";
import { CTACluster, HeroSection, SectionCard } from "@/components/marketing/primitives";
import { MarketingPageShell } from "@/components/marketing/page-shell";
import { buildDocumentMetadata } from "@/lib/templates/metadata";
import { getNativeDocumentByPath } from "@/lib/native-content/content-loader";
import styles from "./page.module.css";

const PATH = "/auxiliary-membership" as const;

const PAGE_IMAGES = {
  hero: "https://static.wixstatic.com/media/92f487_1b9e6a717396499c912c95ed541884b4~mv2.jpg",
  community: "https://static.wixstatic.com/media/92f487_e06bca9eef7844c4b8dbaef89fa60417~mv2.jpeg",
} as const;

const AUXILIARY_RATES = [
  ["Family / Couple", "$900"],
  ["Single Adult", "$450"],
  ["Single Student", "$225"],
] as const;

const FULL_MEMBERSHIP_RATES = [
  ["Family / Couple", "$1,800"],
  ["Single Adult", "$900"],
  ["Single Student", "$450"],
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const document = await getNativeDocumentByPath(PATH);
  return buildDocumentMetadata(document);
}

export default async function AuxiliaryMembershipPage() {
  const document = await getNativeDocumentByPath(PATH);

  if (!document) {
    notFound();
  }

  return (
    <MarketingPageShell currentPath={PATH} contentClassName={styles.content}>
      <HeroSection
        title="Auxiliary & Alumni Membership"
        subtitle="Mekor Alumni Membership"
        className={styles.heroFlat}
        image={{
          src: PAGE_IMAGES.hero,
          alt: "Mekor Habracha community gathering",
          objectFit: "cover",
          objectPosition: "center center",
        }}
        description={[
          "Every Mekor alumnus has a unique share in the zechut of our shul's accomplishments.",
          "We invite you to engage with us on a deeper level by becoming an official Mekor member or auxiliary member.",
        ]}
        actions={[
          { label: "Email to Join", href: "mailto:admin@mekorhabracha.org?subject=Auxiliary%20Membership" },
          { label: "Pay with Venmo", href: "https://www.venmo.com/u/Mekor-Habracha" },
          { label: "Pay with PayPal", href: "https://www.paypal.com/ncp/payment/C5ZNZELMHX2A4" },
        ]}
      />

      <SectionCard title="Auxiliary Membership Rates (5785)" className={styles.flatSection}>
        <p className={styles.copy}>
          This is available to alumni and others who live outside the Philadelphia region, at the following rates.
        </p>
        <div className={styles.rateGrid}>
          {AUXILIARY_RATES.map(([label, amount]) => (
            <article className={styles.rateCard} key={label}>
              <p className={styles.rateTitle}>{label}</p>
              <p className={styles.rateAmount}>{amount}</p>
            </article>
          ))}
        </div>
        <p className={styles.note}>
          Please note: auxiliary membership does not include High Holiday seats.
        </p>
      </SectionCard>

      <SectionCard title="Full Membership Rates" className={styles.flatSection}>
        <div className={styles.rateGrid}>
          {FULL_MEMBERSHIP_RATES.map(([label, amount]) => (
            <article className={styles.rateCard} key={label}>
              <p className={styles.rateTitle}>{label}</p>
              <p className={styles.rateAmount}>{amount}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="How to Join" className={styles.flatSection}>
        <ol className={styles.steps}>
          <li>Email the shul to request membership.</li>
          <li>Make payment online by Venmo, PayPal Giving Fund, or regular PayPal.</li>
          <li>Or mail a check payable to Mekor Habracha.</li>
        </ol>
        <p className={styles.copy}>
          Many people join Mekor as students or early in their professional careers, sometimes with limited financial
          means. We therefore rely on the generosity and lasting commitment of our alumni population to ensure that our
          shul will continue to thrive.
        </p>
        <p className={styles.note}>
          Please email the shul to let us know about your donation and any dedication you&apos;d like to make.
        </p>
        <Image
          src={PAGE_IMAGES.community}
          alt="Mekor members and alumni community scene"
          width={1400}
          height={900}
          className={styles.illustration}
        />
      </SectionCard>

      <SectionCard
        className={`${styles.flatSection} ${styles.formSection}`}
        title="Request Auxiliary Membership"
        description="Send your membership request here and we will follow up with confirmation and payment coordination."
      >
        <AuxiliaryMembershipForm sourcePath={PATH} />
      </SectionCard>

      <SectionCard title="Contact" className={styles.flatSection}>
        <CTACluster
          className={styles.contactLinks}
          items={[
            { label: "Email", href: "mailto:admin@mekorhabracha.org?subject=Auxiliary%20Membership" },
            { label: "Call", href: "tel:+12155254246" },
            { label: "Venmo", href: "https://www.venmo.com/u/Mekor-Habracha" },
            { label: "PayPal Giving Fund", href: "https://www.paypal.com/donate/?hosted_button_id=KUJ7EXBZP4MHC" },
          ]}
        />
      </SectionCard>
    </MarketingPageShell>
  );
}
