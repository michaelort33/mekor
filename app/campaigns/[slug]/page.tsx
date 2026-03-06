import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { MarketingFooter, MarketingPageShell } from "@/components/marketing/page-shell";
import { DonationCheckoutForm } from "@/components/payments/donation-checkout-form";
import { getDb } from "@/db/client";
import { paymentCampaigns } from "@/db/schema";
import styles from "./page.module.css";

type Params = {
  params: Promise<{ slug: string }>;
};

export default async function CampaignPage({ params }: Params) {
  const { slug } = await params;
  const [campaign] = await getDb()
    .select()
    .from(paymentCampaigns)
    .where(eq(paymentCampaigns.slug, slug))
    .limit(1);

  if (!campaign || campaign.status === "archived") {
    notFound();
  }

  return (
    <MarketingPageShell currentPath={campaign.shareablePath} className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.meta}>
          <span className={styles.pill}>Campaign</span>
          <span className={styles.pill}>{campaign.status}</span>
          {campaign.targetAmountCents ? <span className={styles.pill}>Goal ${(campaign.targetAmountCents / 100).toLocaleString()}</span> : null}
        </div>
        <h1>{campaign.title}</h1>
        <p>{campaign.description || "Support this campaign through Mekor's unified donation flow."}</p>
      </section>

      <DonationCheckoutForm
        title={`Support ${campaign.title}`}
        description="Gifts made from this page are automatically attributed to the campaign without manual follow-up."
        defaultAmountCents={campaign.suggestedAmountCents ?? 3600}
        defaultDesignation={campaign.designationLabel}
        campaignId={campaign.id}
        kind="campaign_donation"
        returnPath={campaign.shareablePath}
      />

      <MarketingFooter />
    </MarketingPageShell>
  );
}
