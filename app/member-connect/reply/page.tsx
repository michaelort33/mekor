import type { Metadata } from "next";

import { MarketingPageShell } from "@/components/marketing/page-shell";
import { HeroSection, SectionCard } from "@/components/marketing/primitives";
import { MemberConnectReplyForm } from "@/components/member-ops/member-connect-reply-form";
import { isMemberOpsEnabled } from "@/lib/member-ops/feature";
import styles from "./page.module.css";

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export const metadata: Metadata = {
  title: "Reply | Member Connect",
  description: "Reply to a member-connect relay request.",
};

export default async function MemberConnectReplyPage({ searchParams }: PageProps) {
  const enabled = isMemberOpsEnabled();
  const params = await searchParams;
  const token = params.token ?? "";

  return (
    <MarketingPageShell currentPath="/member-connect/reply" contentClassName={styles.content}>
      <HeroSection
        eyebrow="Community"
        title="Reply to Message"
        subtitle="Your response will be relayed by admin"
        description={[
          "Use this form to reply to a moderated member-connect request.",
          "Your direct email address remains private.",
        ]}
      />

      <SectionCard title="Reply Form">
        {!enabled ? <p>Member operations are currently disabled.</p> : null}
        {enabled ? <MemberConnectReplyForm token={token} /> : null}
      </SectionCard>
    </MarketingPageShell>
  );
}
