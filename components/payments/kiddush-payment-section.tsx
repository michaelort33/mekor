"use client";

import { useState } from "react";
import { CalendarDays, Cake, Croissant, Info, Sandwich, Sparkles, Wine } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { SectionCard } from "@/components/marketing/primitives";
import { DonationCheckoutForm } from "@/components/payments/donation-checkout-form";
import { cn } from "@/lib/utils";
import styles from "@/app/kiddush/page.module.css";

export type KiddushPrice = {
  label: string;
  amount: string;
};

export type KiddushOptionIcon = "kiddush" | "birthday" | "thirdMeal" | "bagelBrunch";

export type KiddushOption = {
  title: string;
  amountCents: number;
  body: string;
  icon: KiddushOptionIcon;
  pricing: readonly KiddushPrice[];
  tagline?: string;
  when?: string;
  note?: string;
  featured?: boolean;
};

type KiddushPaymentSectionProps = {
  options: readonly KiddushOption[];
  returnPath: string;
};

const ICONS: Record<KiddushOptionIcon, LucideIcon> = {
  kiddush: Wine,
  birthday: Cake,
  thirdMeal: Sandwich,
  bagelBrunch: Croissant,
};

export function KiddushPaymentSection({ options, returnPath }: KiddushPaymentSectionProps) {
  const [selectedTitle, setSelectedTitle] = useState(options[0]?.title ?? "Kiddush");
  const selectedOption = options.find((option) => option.title === selectedTitle) ?? options[0];

  if (!selectedOption) {
    return null;
  }

  function selectOption(title: string) {
    setSelectedTitle(title);
    if (typeof window !== "undefined") {
      window.location.hash = "kiddush-payment";
    }
  }

  return (
    <>
      <SectionCard
        title="Choose your sponsorship"
        description="Pick the celebration that fits your simcha, then continue to secure checkout below. Prefer to pay another way? Venmo and PayPal work too."
      >
        <div className={styles.optionGrid}>
          {options.map((option) => {
            const selected = option.title === selectedOption.title;
            const Icon = ICONS[option.icon];

            return (
              <article
                className={cn(
                  styles.optionCard,
                  option.featured && styles.optionCardFeatured,
                  selected && styles.optionCardActive,
                )}
                key={option.title}
                aria-current={selected ? "true" : undefined}
              >
                {option.tagline ? (
                  <span className={styles.optionRibbon}>
                    <Sparkles aria-hidden="true" className={styles.optionRibbonIcon} />
                    {option.tagline}
                  </span>
                ) : null}

                <span className={styles.optionIcon} aria-hidden="true">
                  <Icon strokeWidth={1.8} />
                </span>

                <h3 className={styles.optionTitle}>{option.title}</h3>

                <div className={styles.priceList}>
                  {option.pricing.map((price) => (
                    <div className={styles.priceRow} key={`${option.title}-${price.label}`}>
                      <span className={styles.priceLabel}>{price.label}</span>
                      <span className={styles.priceValue}>{price.amount}</span>
                    </div>
                  ))}
                </div>

                <p className={styles.optionBody}>{option.body}</p>

                {option.when ? (
                  <p className={styles.optionMeta}>
                    <CalendarDays aria-hidden="true" className={styles.optionMetaIcon} />
                    <span>{option.when}</span>
                  </p>
                ) : null}

                {option.note ? (
                  <p className={cn(styles.optionMeta, styles.optionNote)}>
                    <Info aria-hidden="true" className={styles.optionMetaIcon} />
                    <span>{option.note}</span>
                  </p>
                ) : null}

                <button
                  type="button"
                  aria-pressed={selected}
                  className={styles.optionAction}
                  onClick={() => selectOption(option.title)}
                >
                  {selected ? "Selected — continue below" : "Sponsor this"}
                </button>
              </article>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="Complete your sponsorship"
        description={`${selectedOption.title} is selected. Confirm or adjust the amount, then continue to secure Stripe checkout.`}
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
