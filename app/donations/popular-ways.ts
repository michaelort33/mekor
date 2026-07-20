import type { DonationDesignation } from "@/lib/payments/shared";

export type PopularWay = {
  label: string;
  note: string;
  /** When set, the card links out (e.g. the guided Kiddush page) instead of opening the modal. */
  href?: string;
  designation?: DonationDesignation;
  amountCents?: number;
};

export const POPULAR_WAYS: PopularWay[] = [
  { label: "Kiddush or Third Meal sponsorship", note: "$295 members · $360 non-members", href: "/kiddush" },
  { label: "Memorial plaque in the sanctuary", note: "$1,000", designation: "Memorial plaque", amountCents: 100000 },
  { label: "Dedicate a Siddur or Machzor", note: "$100 each", designation: "Book dedication", amountCents: 10000 },
  { label: "Dedicate a Chumash", note: "$200", designation: "Book dedication", amountCents: 20000 },
  {
    label: "Community dinner sponsorship",
    note: "$1,800 full · $1,000 half",
    designation: "Community dinner",
    amountCents: 180000,
  },
  { label: "General contribution", note: "Any amount is appreciated", designation: "General donation" },
];
