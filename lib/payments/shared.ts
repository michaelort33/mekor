type PaymentSource =
  | "stripe"
  | "paypal"
  | "zelle"
  | "flipcause"
  | "network_for_good"
  | "chesed"
  | "manual"
  | "other";

type PaymentKind = "donation" | "membership_dues" | "campaign_donation" | "event" | "goods_services" | "other";
type TaxDeductibility = "deductible" | "partially_deductible" | "non_deductible";

export const PAYMENT_SOURCE_OPTIONS: Array<{ value: PaymentSource; label: string }> = [
  { value: "stripe", label: "Stripe" },
  { value: "paypal", label: "PayPal" },
  { value: "zelle", label: "Zelle" },
  { value: "flipcause", label: "Flipcause" },
  { value: "network_for_good", label: "Network for Good" },
  { value: "chesed", label: "Chesed" },
  { value: "manual", label: "Manual entry" },
  { value: "other", label: "Other" },
];

export const PAYMENT_KIND_OPTIONS: Array<{ value: PaymentKind; label: string }> = [
  { value: "donation", label: "Donation" },
  { value: "campaign_donation", label: "Campaign donation" },
  { value: "membership_dues", label: "Membership dues" },
  { value: "goods_services", label: "Goods / services" },
  { value: "event", label: "Event payment" },
  { value: "other", label: "Other" },
];

export const DESIGNATION_OPTIONS = [
  "General donation",
  "Kiddush",
  "Membership dues",
  "Security donation",
  "Meals",
  "Lulav",
  "Building fund",
  "Chesed fund",
  "Holiday appeal",
] as const;

function clean(value: string | null | undefined) {
  return (value ?? "").trim();
}

export function buildDonationThankYouMessage(input: {
  donorName: string;
  amountCents: number;
  designation: string;
  organizationName?: string;
}) {
  const organizationName = input.organizationName?.trim() || "Mekor Habracha";
  const donorName = clean(input.donorName) || "Friend";
  const designation = clean(input.designation) || "our community";
  const amount = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(input.amountCents / 100);
  return {
    subject: `Thank you for supporting ${organizationName}`,
    text: `Dear ${donorName},\n\nThank you for your generous gift of ${amount} supporting ${designation}. Your support strengthens ${organizationName} and helps sustain the community.\n\nA separate tax receipt is available for your records.\n\nWith gratitude,\n${organizationName}`,
  };
}

export function deriveTaxTreatment(input: {
  kind: PaymentKind;
  designation: string;
  amountCents: number;
  goodsServicesValueCents?: number;
  explicitTaxDeductibility?: TaxDeductibility | null;
}) {
  const designation = clean(input.designation).toLowerCase();
  const goodsServicesValueCents = Math.max(0, input.goodsServicesValueCents ?? 0);

  if (input.explicitTaxDeductibility) {
    const deductibleAmountCents =
      input.explicitTaxDeductibility === "deductible"
        ? input.amountCents
        : input.explicitTaxDeductibility === "partially_deductible"
          ? Math.max(0, input.amountCents - goodsServicesValueCents)
          : 0;
    return {
      taxDeductibility: input.explicitTaxDeductibility,
      deductibleAmountCents,
      goodsServicesValueCents,
    };
  }

  if (designation.includes("meal") || designation.includes("lulav") || input.kind === "goods_services") {
    return {
      taxDeductibility: "non_deductible" as const,
      deductibleAmountCents: 0,
      goodsServicesValueCents: goodsServicesValueCents || input.amountCents,
    };
  }

  if (input.kind === "membership_dues" || input.kind === "event" || input.kind === "other") {
    return {
      taxDeductibility: "non_deductible" as const,
      deductibleAmountCents: 0,
      goodsServicesValueCents,
    };
  }

  if (goodsServicesValueCents > 0) {
    const deductibleAmountCents = Math.max(0, input.amountCents - goodsServicesValueCents);
    return {
      taxDeductibility: deductibleAmountCents > 0 ? ("partially_deductible" as const) : ("non_deductible" as const),
      deductibleAmountCents,
      goodsServicesValueCents,
    };
  }

  if (designation.includes("kiddush")) {
    return {
      taxDeductibility: "deductible" as const,
      deductibleAmountCents: input.amountCents,
      goodsServicesValueCents: 0,
    };
  }

  return {
    taxDeductibility: "deductible" as const,
    deductibleAmountCents: input.amountCents,
    goodsServicesValueCents: 0,
  };
}
