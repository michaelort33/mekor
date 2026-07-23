import Link from "next/link";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { MembershipApplicationForm } from "./application-form";
import styles from "./page.module.css";

export const metadata = buildPageMetadata({
  path: "/membership/apply",
  title: "Membership Application | Mekor Habracha",
  description: "Apply for Mekor Habracha membership online. Submit your household details directly to the Mekor admin team for review.",
});

export default function MembershipApplicationPage() {
  return (
    <MarketingPageShell currentPath="/membership" className={styles.page} contentClassName={styles.content}>
      <header className={styles.headerBand}>
        <div>
          <p className={styles.sectionEyebrow}>Mekor Habracha membership</p>
          <h1 className={styles.pageTitle}>Apply to join</h1>
          <p className={styles.leadText}>
            Five short steps for new memberships and renewals. Your application goes straight to Mekor&apos;s review queue —
            no external form service.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/membership" className={styles.secondaryAction}>
            Membership details &amp; rates
          </Link>
          <a href="mailto:admin@mekorhabracha.org?subject=Membership%20Application" className={styles.primaryAction}>
            Email membership team
          </a>
        </div>
      </header>

      <MembershipApplicationForm />

      <section className={styles.helpStrip} aria-labelledby="membership-help-title">
        <div>
          <h2 id="membership-help-title">Questions about dues, payment plans, or fit?</h2>
          <p className={styles.bodyText}>
            We never turn anyone away for lack of funds. Email the shul before submitting if you want to talk through options.
          </p>
        </div>
        <div className={styles.helpActions}>
          <a href="mailto:admin@mekorhabracha.org?subject=Membership%20Question" className={styles.primaryAction}>
            Email the membership team
          </a>
          <Link href="/membership" className={styles.secondaryAction}>
            Review membership details
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </MarketingPageShell>
  );
}
