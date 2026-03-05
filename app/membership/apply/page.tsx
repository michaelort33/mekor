import type { Metadata } from "next";
import Link from "next/link";

import { HeroSection, SectionCard } from "@/components/marketing/primitives";
import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { MembershipApplicationForm } from "./application-form";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Membership Application | Mekor Habracha",
  description: "Apply for Mekor Habracha membership online. Submit your household details directly to the Mekor admin team for review.",
};

export default function MembershipApplicationPage() {
  return (
    <MarketingPageShell currentPath="/membership" className={styles.page} contentClassName={styles.content}>
      <HeroSection
        eyebrow="Membership application"
        title="Apply to join Mekor Habracha"
        subtitle="A direct application reviewed by the Mekor team"
        variant="quiet"
        image={{
          src: "https://static.wixstatic.com/media/11062b_6ef3ee78b5784e3586f8a9366c89f5ee~mv2.jpeg",
          alt: "Mekor Habracha community gathering",
          objectFit: "cover",
          objectPosition: "50% 42%",
        }}
        description={[
          "Use this form for new memberships and renewals. It keeps the existing application content, but now submissions stay inside Mekor and land directly in the admin panel for review.",
          "After approval, you will receive a welcome email. If you do not already have a Mekor account, that email will include a secure setup link.",
        ]}
        actions={[
          { label: "Back to membership details", href: "/membership" },
          { label: "Email membership team", href: "mailto:mekorhabracha@gmail.com?subject=Membership%20Application" },
        ]}
      />

      <SectionCard className={styles.introCard}>
        <div className={styles.introGrid}>
          <div>
            <p className={styles.sectionEyebrow}>What to expect</p>
            <h2 className={styles.panelTitle}>One application, then a real review and follow-up.</h2>
            <p className={styles.bodyText}>
              Submit your household details once. The application goes straight into Mekor&apos;s admin queue, where staff can review, approve, and follow up without retyping anything from an external form service.
            </p>
          </div>
          <ul className={styles.expectList}>
            <li>Choose whether this is a new membership or a renewal.</li>
            <li>Select the annual membership category that fits your household.</li>
            <li>Add spouse, household, yahrzeit, and volunteer details in the same form.</li>
            <li>After approval, expect a welcome email and next steps for access and payment.</li>
          </ul>
        </div>
      </SectionCard>

      <MembershipApplicationForm />

      <SectionCard className={styles.helpCard}>
        <div className={styles.helpGrid}>
          <div>
            <p className={styles.sectionEyebrow}>Need help first?</p>
            <h2 className={styles.panelTitle}>Questions about dues, payment plans, or fit?</h2>
            <p className={styles.bodyText}>
              We never turn anyone away for lack of funds. If you want to discuss membership before submitting, email the shul or return to the membership overview page.
            </p>
          </div>
          <div className={styles.helpActions}>
            <a href="mailto:mekorhabracha@gmail.com?subject=Membership%20Question" className={styles.primaryAction}>
              Email the membership team
            </a>
            <Link href="/membership" className={styles.secondaryAction}>
              Review membership details
            </Link>
          </div>
        </div>
      </SectionCard>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
