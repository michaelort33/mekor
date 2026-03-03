import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);
const optionalText = z.string().trim().optional().default("");

export const commChannelSchema = z.enum(["email", "sms", "whatsapp"]);
export const renewalStatusSchema = z.enum([
  "not_started",
  "invited",
  "form_submitted",
  "payment_pending",
  "active",
  "on_hold",
]);
export const invoiceStatusSchema = z.enum(["open", "partially_paid", "paid", "waived", "void"]);
export const messageRequestStatusSchema = z.enum(["pending_review", "approved", "rejected", "closed"]);
export const volunteerSignupStatusSchema = z.enum(["confirmed", "waitlisted", "cancelled"]);

export const householdSchema = z.object({
  id: z.number().int().positive(),
  name: nonEmptyString,
  billingEmail: z.string().trim().email().or(z.literal("")),
  billingPhone: optionalText,
  address: optionalText,
  notes: optionalText,
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const householdMemberSchema = z.object({
  id: z.number().int().positive(),
  householdId: z.number().int().positive(),
  firstName: nonEmptyString,
  lastName: optionalText,
  displayName: nonEmptyString,
  email: z.string().trim().email().nullable(),
  phone: optionalText,
  relationship: optionalText,
  isPrimary: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const membershipTermSchema = z.object({
  id: z.number().int().positive(),
  householdId: z.number().int().positive(),
  cycleLabel: nonEmptyString,
  cycleStart: z.date(),
  cycleEnd: z.date(),
  planLabel: optionalText,
  renewalStatus: renewalStatusSchema,
  invitedAt: z.date().nullable(),
  submittedAt: z.date().nullable(),
  activatedAt: z.date().nullable(),
  notes: optionalText,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const duesInvoiceSchema = z.object({
  id: z.number().int().positive(),
  householdId: z.number().int().positive(),
  membershipTermId: z.number().int().positive().nullable(),
  label: optionalText,
  amountCents: z.number().int(),
  paidCents: z.number().int(),
  status: invoiceStatusSchema,
  dueDate: z.date().nullable(),
  issuedAt: z.date(),
  notes: optionalText,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const communicationPreferenceInputSchema = z.object({
  memberId: z.number().int().positive(),
  channel: commChannelSchema,
  optIn: z.boolean(),
  source: z.string().trim().max(80).optional().default("member_form"),
  updatedBy: z.string().trim().max(120).optional().default("member"),
});

export const renewalSubmissionInputSchema = z.object({
  token: nonEmptyString,
  planLabel: z.string().trim().max(120).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
  communication: z.array(communicationPreferenceInputSchema.pick({ channel: true, optIn: true })).default([]),
});

export const volunteerSlotSchema = z.object({
  id: z.number().int().positive(),
  opportunityId: z.number().int().positive(),
  opportunityName: nonEmptyString,
  label: nonEmptyString,
  startAt: z.date(),
  endAt: z.date().nullable(),
  capacity: z.number().int().positive(),
  signupOpen: z.boolean(),
  location: optionalText,
  confirmedCount: z.number().int().nonnegative(),
  waitlistedCount: z.number().int().nonnegative(),
  remaining: z.number().int(),
});

export const volunteerSlotSignupInputSchema = z.object({
  slotId: z.number().int().positive(),
  memberId: z.number().int().positive().optional(),
  name: nonEmptyString.max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(60).optional().default(""),
  note: z.string().trim().max(2000).optional().default(""),
  committeeInterests: z.array(z.string().trim().min(1).max(120)).optional().default([]),
});

export const eventRsvpInputSchema = z.object({
  name: nonEmptyString.max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(60).optional().default(""),
  attendeeCount: z.number().int().min(1).max(20).optional().default(1),
  note: z.string().trim().max(2000).optional().default(""),
  sourcePath: z.string().trim().max(512).optional().default(""),
});

export const memberMessageRequestInputSchema = z.object({
  senderMemberId: z.number().int().positive().optional(),
  senderName: nonEmptyString.max(120),
  senderEmail: z.string().trim().email().max(255),
  senderPhone: z.string().trim().max(60).optional().default(""),
  recipientMemberId: z.number().int().positive(),
  subject: z.string().trim().max(255).optional().default(""),
  message: z.string().trim().min(1).max(5000),
});

export const memberMessageReplyInputSchema = z.object({
  token: nonEmptyString,
  message: z.string().trim().min(1).max(5000),
});

export const memberMessageRelayInputSchema = z.object({
  requestId: z.number().int().positive(),
  to: z.enum(["sender", "recipient"]),
  subject: z.string().trim().max(255).optional().default(""),
  message: z.string().trim().min(1).max(5000),
});

export const dashboardSummarySchema = z.object({
  overdueHouseholds: z.array(
    z.object({
      householdId: z.number().int().positive(),
      householdName: nonEmptyString,
      billingEmail: z.string().trim().email().or(z.literal("")),
      overdueCents: z.number().int(),
      oldestDueDate: z.date().nullable(),
    }),
  ),
  renewalCounts: z.record(renewalStatusSchema, z.number().int().nonnegative()),
  upcomingEvents: z.array(
    z.object({
      path: nonEmptyString,
      title: nonEmptyString,
      startAt: z.date().nullable(),
      rsvpCount: z.number().int().nonnegative(),
    }),
  ),
  volunteerSlotStats: z.array(
    z.object({
      slotId: z.number().int().positive(),
      label: nonEmptyString,
      startAt: z.date(),
      confirmedCount: z.number().int().nonnegative(),
      waitlistedCount: z.number().int().nonnegative(),
      capacity: z.number().int().positive(),
    }),
  ),
  pendingMessageRequests: z.array(
    z.object({
      id: z.number().int().positive(),
      senderName: nonEmptyString,
      recipientDisplayName: nonEmptyString,
      subject: z.string(),
      createdAt: z.date(),
    }),
  ),
});

export const householdCsvRowSchema = z.object({
  householdName: nonEmptyString,
  billingEmail: z.string().trim().email(),
  billingPhone: z.string().trim().max(60).optional().default(""),
  memberFirstName: nonEmptyString,
  memberLastName: z.string().trim().max(120).optional().default(""),
  memberDisplayName: nonEmptyString,
  memberEmail: z.string().trim().email().optional(),
  memberPhone: z.string().trim().max(60).optional().default(""),
  relationship: z.string().trim().max(80).optional().default(""),
  isPrimary: z.boolean().optional().default(false),
  cycleLabel: nonEmptyString,
  cycleStartIso: nonEmptyString,
  cycleEndIso: nonEmptyString,
  renewalStatus: renewalStatusSchema,
  openingBalanceCents: z.number().int().optional().default(0),
});

export type Household = z.infer<typeof householdSchema>;
export type HouseholdMember = z.infer<typeof householdMemberSchema>;
export type MembershipTerm = z.infer<typeof membershipTermSchema>;
export type DuesInvoice = z.infer<typeof duesInvoiceSchema>;
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
export type VolunteerSlot = z.infer<typeof volunteerSlotSchema>;
export type MemberMessageRequestInput = z.infer<typeof memberMessageRequestInputSchema>;
export type CommunicationPreferenceInput = z.infer<typeof communicationPreferenceInputSchema>;
