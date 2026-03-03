import type { Metadata } from "next";

import { MarketingPageShell } from "@/components/marketing/page-shell";
import { HeroSection, SectionCard } from "@/components/marketing/primitives";
import { RenewalForm } from "@/components/member-ops/renewal-form";
import { isMemberOpsEnabled } from "@/lib/member-ops/feature";
import styles from "./page.module.css";

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export const metadata: Metadata = {
  title: "Membership Renewal | Mekor Habracha",
  description: "Submit your annual membership renewal and communication preferences.",
};

export default async function MembershipRenewPage({ searchParams }: PageProps) {
  const enabled = isMemberOpsEnabled();
  const params = await searchParams;
  const token = params.token ?? "";

  return (
    <MarketingPageShell currentPath="/membership/renew" contentClassName={styles.content}>
      <HeroSection
        eyebrow="Membership"
        title="Renew Membership"
        subtitle="Rosh Hashana cycle renewal form"
        description={[
          "Use your household renewal link to submit your plan and communication preferences.",
          "If you do not have a renewal link, contact the shul office and we will send one.",
        ]}
      />

      <SectionCard title="Renewal Submission">
        {!enabled ? <p>Member operations are currently disabled. Please contact the office.</p> : null}
        {enabled ? <RenewalForm token={token} /> : null}
      </SectionCard>
    </MarketingPageShell>
  );
}
