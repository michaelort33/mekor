"use client";

import { useState } from "react";

import { SectionCard } from "@/components/marketing/primitives";
import { DonationCheckoutForm } from "@/components/payments/donation-checkout-form";
import { cn } from "@/lib/utils";
import styles from "@/app/kiddush/page.module.css";

type KiddushOption = {
  title: string;
  rate: string;
  amountCents: number;
  body: string;
};

type KiddushPaymentSectionProps = {
  options: readonly KiddushOption[];
  returnPath: string;
};

export function KiddushPaymentSection({ options, returnPath }: KiddushPaymentSectionProps) {
  const [selectedTitle, setSelectedTitle] = useState(options[0]?.title ?? "Kiddush");
  const selectedOption = options.find((option) => option.title === selectedTitle) ?? options[0];

  if (!selectedOption) {
    return null;
  }

  return (
    <>
      <SectionCard title="Kiddush Sponsorship Options">
        <div className={styles.optionGrid}>
          {options.map((option) => {
            const selected = option.title === selectedOption.title;

            return (
              <article
                className={cn(styles.optionCard, selected && styles.optionCardActive)}
                key={option.title}
                aria-current={selected ? "true" : undefined}
              >
                <p className={styles.optionTitle}>{option.title}</p>
                <p className={styles.optionRate}>{option.rate}</p>
                <p className={styles.optionBody}>{option.body}</p>
                <button
                  type="button"
                  className={styles.optionAction}
                  onClick={() => {
                    setSelectedTitle(option.title);
                    window.location.hash = "kiddush-payment";
                  }}
                >
                  {selected ? "Selected" : "Use this amount"}
                </button>
              </article>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="Pay for a Kiddush"
        description={`Enter the sponsorship amount here and continue directly to secure Stripe checkout. ${selectedOption.title} is currently selected.`}
        className={styles.checkoutSection}
      >
        <div id="kiddush-payment">
          <DonationCheckoutForm
            key={selectedOption.title}
            title={`${selectedOption.title} payment`}
            description="Use this checkout for Kiddush sponsorships, dedications, and related support. You can keep the selected amount or change it before opening Stripe checkout."
            defaultAmountCents={selectedOption.amountCents}
            defaultDesignation="Kiddush"
            returnPath={returnPath}
          />
        </div>
      </SectionCard>
    </>
  );
}
