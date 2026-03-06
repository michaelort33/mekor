import { z } from "zod";

export const MEMBERSHIP_APPLICATION_STATUS = ["pending", "approved", "declined"] as const;
export const MEMBERSHIP_APPLICATION_TYPE = ["new", "renewal"] as const;
export const MEMBERSHIP_CATEGORY = ["single", "couple_family", "student"] as const;
export const PAYMENT_METHOD_PREFERENCE = ["undecided", "check", "venmo", "paypal", "credit_card", "other"] as const;
export const MEMBERSHIP_APPROVAL_BILLING_MODE = ["none", "invoice", "schedule"] as const;

export type MembershipApplicationStatus = (typeof MEMBERSHIP_APPLICATION_STATUS)[number];
export type MembershipApplicationType = (typeof MEMBERSHIP_APPLICATION_TYPE)[number];
export type MembershipCategory = (typeof MEMBERSHIP_CATEGORY)[number];
export type PaymentMethodPreference = (typeof PAYMENT_METHOD_PREFERENCE)[number];
export type MembershipApprovalBillingMode = (typeof MEMBERSHIP_APPROVAL_BILLING_MODE)[number];

export const MEMBERSHIP_CATEGORY_OPTIONS: Array<{
  value: MembershipCategory;
  label: string;
  amountCents: number;
  detail: string;
}> = [
  {
    value: "single",
    label: "Single Membership",
    amountCents: 100_000,
    detail: "$1,000 until Rosh Hashana 5786",
  },
  {
    value: "couple_family",
    label: "Couple/Family Membership",
    amountCents: 200_000,
    detail: "$2,000 until Rosh Hashana 5786",
  },
  {
    value: "student",
    label: "Student Membership",
    amountCents: 50_000,
    detail: "$500 until Rosh Hashana 5786",
  },
];

export const VOLUNTEER_INTEREST_OPTIONS = [
  "Hospitality and Shabbat meals",
  "Learning and classes",
  "Children and family programming",
  "Holiday and event setup",
  "Kiddush support",
  "Community care and chesed",
  "Communications and outreach",
  "Security and operations",
] as const;

export const applicationRowSchema = z.object({
  name: z.string().trim().max(120).default(""),
  hebrewName: z.string().trim().max(120).default(""),
  relationship: z.string().trim().max(80).default(""),
});

export const yahrzeitRowSchema = z.object({
  name: z.string().trim().max(120).default(""),
  relationship: z.string().trim().max(80).default(""),
  hebrewDate: z.string().trim().max(120).default(""),
  englishDate: z.string().trim().max(120).default(""),
});

export const membershipApplicationSchema = z
  .object({
    applicationType: z.enum(MEMBERSHIP_APPLICATION_TYPE),
    membershipCategory: z.enum(MEMBERSHIP_CATEGORY),
    includeSecurityDonation: z.boolean().default(true),
    coverOnlineFees: z.boolean().default(false),
    preferredPaymentMethod: z.enum(PAYMENT_METHOD_PREFERENCE).default("undecided"),
    firstName: z.string().trim().min(1).max(120),
    lastName: z.string().trim().min(1).max(120),
    hebrewName: z.string().trim().max(120).default(""),
    email: z.string().trim().email().max(255),
    phone: z.string().trim().min(7).max(60),
    addressLine1: z.string().trim().min(1).max(160),
    addressLine2: z.string().trim().max(160).default(""),
    city: z.string().trim().min(1).max(120),
    state: z.string().trim().min(2).max(80),
    postalCode: z.string().trim().min(3).max(20),
    spouseFirstName: z.string().trim().max(120).default(""),
    spouseLastName: z.string().trim().max(120).default(""),
    spouseHebrewName: z.string().trim().max(120).default(""),
    spouseEmail: z.string().trim().max(255).default(""),
    spousePhone: z.string().trim().max(60).default(""),
    householdMembers: z.array(applicationRowSchema).max(12).default([]),
    yahrzeits: z.array(yahrzeitRowSchema).max(12).default([]),
    volunteerInterests: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
    notes: z.string().trim().max(4000).default(""),
    sourcePath: z.string().trim().max(512).default("/membership/apply"),
  })
  .transform((value) => ({
    ...value,
    spouseEmail: value.spouseEmail.trim(),
    householdMembers: value.householdMembers.filter((member) => member.name || member.hebrewName || member.relationship),
    yahrzeits: value.yahrzeits.filter((row) => row.name || row.relationship || row.hebrewDate || row.englishDate),
    volunteerInterests: Array.from(new Set(value.volunteerInterests.filter(Boolean))),
  }))
  .superRefine((value, ctx) => {
    if (value.spouseEmail && !z.string().email().safeParse(value.spouseEmail).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["spouseEmail"],
        message: "Enter a valid spouse email address",
      });
    }

    value.householdMembers.forEach((member, index) => {
      if (!member.name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["householdMembers", index, "name"],
          message: "Household member name is required",
        });
      }
    });

    value.yahrzeits.forEach((row, index) => {
      if (!row.name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["yahrzeits", index, "name"],
          message: "Yahrzeit name is required",
        });
      }
    });
  });

export const membershipApprovalPlanSchema = z
  .object({
    membershipStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    membershipRenewalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    billingMode: z.enum(MEMBERSHIP_APPROVAL_BILLING_MODE),
    invoiceLabel: z.string().trim().min(1).max(160),
    invoiceAmountCents: z.number().int().min(0),
    invoiceDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    scheduleFrequency: z.enum(["annual", "monthly", "custom"]),
    scheduleAmountCents: z.number().int().min(0),
    scheduleNextDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    scheduleNotes: z.string().trim().max(4000).default(""),
    createSpouseLead: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.membershipRenewalDate < value.membershipStartDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["membershipRenewalDate"],
        message: "Renewal date must be on or after the membership start date",
      });
    }

    if (value.billingMode === "invoice") {
      if (value.invoiceAmountCents < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["invoiceAmountCents"],
          message: "Invoice amount must be greater than zero",
        });
      }
      if (value.invoiceDueDate < value.membershipStartDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["invoiceDueDate"],
          message: "Invoice due date must be on or after the membership start date",
        });
      }
    }

    if (value.billingMode === "schedule") {
      if (value.scheduleAmountCents < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scheduleAmountCents"],
          message: "Schedule amount must be greater than zero",
        });
      }
      if (value.scheduleNextDueDate < value.membershipStartDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["scheduleNextDueDate"],
          message: "Schedule due date must be on or after the membership start date",
        });
      }
    }
  });

export type MembershipApplicationInput = z.input<typeof membershipApplicationSchema>;
export type MembershipApplicationRecordInput = z.output<typeof membershipApplicationSchema>;
export type MembershipApprovalPlan = z.output<typeof membershipApprovalPlanSchema>;

function dateOnlyUtc(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addYearsToDateOnly(value: string, yearsToAdd: number) {
  const source = new Date(`${value}T00:00:00.000Z`);
  const target = new Date(
    Date.UTC(source.getUTCFullYear() + yearsToAdd, source.getUTCMonth(), source.getUTCDate()),
  );
  return dateOnlyUtc(target);
}

export function getMembershipCategoryOption(category: MembershipCategory) {
  const option = MEMBERSHIP_CATEGORY_OPTIONS.find((item) => item.value === category);
  if (!option) {
    throw new Error(`Unknown membership category: ${category}`);
  }
  return option;
}

export function getMembershipCategoryLabel(category: MembershipCategory) {
  return getMembershipCategoryOption(category).label;
}

export function getApplicationTypeLabel(type: MembershipApplicationType) {
  return type === "renewal" ? "Renewing member" : "New member";
}

export function getPaymentMethodLabel(method: PaymentMethodPreference) {
  switch (method) {
    case "check":
      return "Personal check";
    case "venmo":
      return "Venmo";
    case "paypal":
      return "PayPal";
    case "credit_card":
      return "Credit card";
    case "other":
      return "Other";
    default:
      return "Still deciding";
  }
}

export function formatUsd(amountCents: number) {
  return (amountCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function calculateMembershipEstimate(input: {
  membershipCategory: MembershipCategory;
  includeSecurityDonation: boolean;
}) {
  const baseAmountCents = getMembershipCategoryOption(input.membershipCategory).amountCents;
  const securityDonationCents = input.includeSecurityDonation ? 10_000 : 0;
  return {
    baseAmountCents,
    securityDonationCents,
    totalAmountCents: baseAmountCents + securityDonationCents,
  };
}

export function buildApplicantDisplayName(input: { firstName: string; lastName: string }) {
  return `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
}

export function buildDefaultMembershipApprovalPlan(input: {
  totalAmountCents: number;
  spouseEmail?: string;
  now?: Date;
}): MembershipApprovalPlan {
  const now = input.now ?? new Date();
  const membershipStartDate = dateOnlyUtc(now);
  const membershipRenewalDate = addYearsToDateOnly(membershipStartDate, 1);
  const totalAmountCents = Math.max(0, input.totalAmountCents);
  const hasSpouseEmail = Boolean(input.spouseEmail?.trim());

  return {
    membershipStartDate,
    membershipRenewalDate,
    billingMode: totalAmountCents > 0 ? "invoice" : "none",
    invoiceLabel: "Membership dues",
    invoiceAmountCents: totalAmountCents,
    invoiceDueDate: membershipStartDate,
    scheduleFrequency: "annual",
    scheduleAmountCents: totalAmountCents,
    scheduleNextDueDate: membershipStartDate,
    scheduleNotes: "Created from membership application approval",
    createSpouseLead: hasSpouseEmail,
  };
}
