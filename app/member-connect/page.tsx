import type { Metadata } from "next";

import { MarketingPageShell } from "@/components/marketing/page-shell";
import { HeroSection, SectionCard } from "@/components/marketing/primitives";
import { MemberConnectForm } from "@/components/member-ops/member-connect-form";
import { isMemberOpsEnabled } from "@/lib/member-ops/feature";
import { listConnectRecipients } from "@/lib/member-ops/messaging";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Member Connect | Mekor Habracha",
  description: "Request to contact another member through a moderated relay flow.",
};

export default async function MemberConnectPage() {
  const enabled = isMemberOpsEnabled();
  const recipients = enabled ? await listConnectRecipients() : [];

  return (
    <MarketingPageShell currentPath="/member-connect" contentClassName={styles.content}>
      <HeroSection
        eyebrow="Community"
        title="Member-to-Member Connect"
        subtitle="Private moderated relay"
        description={[
          "Send a request to connect with another member without exposing personal email addresses.",
          "Requests are reviewed by admin before messages are relayed.",
        ]}
      />

      <SectionCard title="Submit a Connect Request">
        {!enabled ? <p>Member operations are currently disabled. Please contact admin@mekorhabracha.org.</p> : null}
        {enabled ? <MemberConnectForm recipients={recipients} /> : null}
      </SectionCard>
    </MarketingPageShell>
  );
}
