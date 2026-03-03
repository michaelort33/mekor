import {
  boolean,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const templateStatusEnum = pgEnum("template_status", ["draft", "ready", "sent", "archived"]);
export const renewalStatusEnum = pgEnum("renewal_status", [
  "not_started",
  "invited",
  "form_submitted",
  "payment_pending",
  "active",
  "on_hold",
]);
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "open",
  "partially_paid",
  "paid",
  "waived",
  "void",
]);
export const commChannelEnum = pgEnum("comm_channel", ["email", "sms", "whatsapp"]);
export const messageRequestStatusEnum = pgEnum("message_request_status", [
  "pending_review",
  "approved",
  "rejected",
  "closed",
]);
export const volunteerSignupStatusEnum = pgEnum("volunteer_signup_status", [
  "confirmed",
  "waitlisted",
  "cancelled",
]);

export const formSubmissions = pgTable("form_submissions", {
  id: serial("id").primaryKey(),
  formType: varchar("form_type", { length: 80 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 60 }).notNull().default(""),
  message: text("message").notNull(),
  sourcePath: varchar("source_path", { length: 512 }).notNull().default(""),
  payloadJson: json("payload_json").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const formDeliveryLog = pgTable("form_delivery_log", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull(),
  provider: varchar("provider", { length: 60 }).notNull().default("resend"),
  status: varchar("status", { length: 40 }).notNull(),
  errorMessage: varchar("error_message", { length: 512 }).notNull().default(""),
  deliveredAt: timestamp("delivered_at").defaultNow().notNull(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  path: varchar("path", { length: 512 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  shortDate: varchar("short_date", { length: 120 }).notNull().default(""),
  location: text("location").notNull().default(""),
  timeLabel: varchar("time_label", { length: 255 }).notNull().default(""),
  startAt: timestamp("start_at"),
  endAt: timestamp("end_at"),
  isClosed: boolean("is_closed").notNull().default(false),
  sourceCapturedAt: timestamp("source_captured_at"),
  sourceType: varchar("source_type", { length: 40 }).notNull().default("mirror"),
  sourceJson: json("source_json").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const households = pgTable("households", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  billingEmail: varchar("billing_email", { length: 255 }).notNull().default(""),
  billingPhone: varchar("billing_phone", { length: 60 }).notNull().default(""),
  address: text("address").notNull().default(""),
  notes: text("notes").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const householdMembers = pgTable(
  "household_members",
  {
    id: serial("id").primaryKey(),
    householdId: integer("household_id").notNull(),
    firstName: varchar("first_name", { length: 120 }).notNull(),
    lastName: varchar("last_name", { length: 120 }).notNull().default(""),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 60 }).notNull().default(""),
    relationship: varchar("relationship", { length: 80 }).notNull().default(""),
    isPrimary: boolean("is_primary").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    householdIndex: index("household_members_household_idx").on(table.householdId),
    emailUnique: uniqueIndex("household_members_email_unique").on(table.email),
  }),
);

export const membershipTerms = pgTable(
  "membership_terms",
  {
    id: serial("id").primaryKey(),
    householdId: integer("household_id").notNull(),
    cycleLabel: varchar("cycle_label", { length: 40 }).notNull(),
    cycleStart: timestamp("cycle_start").notNull(),
    cycleEnd: timestamp("cycle_end").notNull(),
    planLabel: varchar("plan_label", { length: 120 }).notNull().default(""),
    renewalStatus: renewalStatusEnum("renewal_status").notNull().default("not_started"),
    invitedAt: timestamp("invited_at"),
    submittedAt: timestamp("submitted_at"),
    activatedAt: timestamp("activated_at"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    householdCycleUnique: uniqueIndex("membership_terms_household_cycle_unique").on(
      table.householdId,
      table.cycleLabel,
    ),
    cycleLookupIndex: index("membership_terms_household_cycle_idx").on(table.householdId, table.cycleLabel),
  }),
);

export const duesInvoices = pgTable(
  "dues_invoices",
  {
    id: serial("id").primaryKey(),
    householdId: integer("household_id").notNull(),
    membershipTermId: integer("membership_term_id"),
    label: varchar("label", { length: 160 }).notNull().default(""),
    amountCents: integer("amount_cents").notNull().default(0),
    paidCents: integer("paid_cents").notNull().default(0),
    status: invoiceStatusEnum("status").notNull().default("open"),
    dueDate: timestamp("due_date"),
    issuedAt: timestamp("issued_at").defaultNow().notNull(),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    householdStatusDueDateIndex: index("dues_invoices_household_status_due_date_idx").on(
      table.householdId,
      table.status,
      table.dueDate,
    ),
  }),
);

export const duesPayments = pgTable(
  "dues_payments",
  {
    id: serial("id").primaryKey(),
    householdId: integer("household_id").notNull(),
    invoiceId: integer("invoice_id"),
    amountCents: integer("amount_cents").notNull(),
    paidAt: timestamp("paid_at").defaultNow().notNull(),
    method: varchar("method", { length: 60 }).notNull().default(""),
    reference: varchar("reference", { length: 120 }).notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    householdIndex: index("dues_payments_household_idx").on(table.householdId),
    invoiceIndex: index("dues_payments_invoice_idx").on(table.invoiceId),
  }),
);

export const communicationPreferences = pgTable(
  "communication_preferences",
  {
    id: serial("id").primaryKey(),
    memberId: integer("member_id").notNull(),
    channel: commChannelEnum("channel").notNull(),
    optIn: boolean("opt_in").notNull().default(false),
    consentCapturedAt: timestamp("consent_captured_at"),
    source: varchar("source", { length: 80 }).notNull().default("member_form"),
    updatedBy: varchar("updated_by", { length: 120 }).notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    memberChannelUnique: uniqueIndex("communication_preferences_member_channel_unique").on(
      table.memberId,
      table.channel,
    ),
  }),
);

export const volunteerOpportunities = pgTable("volunteer_opportunities", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull().unique(),
  description: text("description").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const volunteerSlots = pgTable(
  "volunteer_slots",
  {
    id: serial("id").primaryKey(),
    opportunityId: integer("opportunity_id").notNull(),
    label: varchar("label", { length: 180 }).notNull(),
    startAt: timestamp("start_at").notNull(),
    endAt: timestamp("end_at"),
    capacity: integer("capacity").notNull().default(1),
    signupOpen: boolean("signup_open").notNull().default(true),
    location: varchar("location", { length: 255 }).notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    startOpenIndex: index("volunteer_slots_start_open_idx").on(table.startAt, table.signupOpen),
  }),
);

export const volunteerSlotSignups = pgTable(
  "volunteer_slot_signups",
  {
    id: serial("id").primaryKey(),
    slotId: integer("slot_id").notNull(),
    memberId: integer("member_id"),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 60 }).notNull().default(""),
    note: text("note").notNull().default(""),
    status: volunteerSignupStatusEnum("status").notNull().default("confirmed"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    slotSignupUnique: uniqueIndex("volunteer_slot_signups_slot_email_unique").on(table.slotId, table.email),
    slotIndex: index("volunteer_slot_signups_slot_idx").on(table.slotId),
  }),
);

export const committeeInterests = pgTable(
  "committee_interests",
  {
    id: serial("id").primaryKey(),
    memberId: integer("member_id"),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 60 }).notNull().default(""),
    committee: varchar("committee", { length: 120 }).notNull(),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    committeeIndex: index("committee_interests_committee_idx").on(table.committee),
  }),
);

export const eventRsvps = pgTable(
  "event_rsvps",
  {
    id: serial("id").primaryKey(),
    eventPath: varchar("event_path", { length: 512 }).notNull(),
    eventSlug: varchar("event_slug", { length: 255 }).notNull(),
    eventTitle: varchar("event_title", { length: 255 }).notNull().default(""),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 60 }).notNull().default(""),
    attendeeCount: integer("attendee_count").notNull().default(1),
    note: text("note").notNull().default(""),
    sourcePath: varchar("source_path", { length: 512 }).notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    eventPathCreatedIndex: index("event_rsvps_event_path_created_idx").on(table.eventPath, table.createdAt),
  }),
);

export const memberMessageRequests = pgTable(
  "member_message_requests",
  {
    id: serial("id").primaryKey(),
    senderMemberId: integer("sender_member_id"),
    senderName: varchar("sender_name", { length: 120 }).notNull(),
    senderEmail: varchar("sender_email", { length: 255 }).notNull(),
    senderPhone: varchar("sender_phone", { length: 60 }).notNull().default(""),
    recipientMemberId: integer("recipient_member_id").notNull(),
    recipientDisplayName: varchar("recipient_display_name", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 255 }).notNull().default(""),
    message: text("message").notNull(),
    status: messageRequestStatusEnum("status").notNull().default("pending_review"),
    adminNote: text("admin_note").notNull().default(""),
    approvedAt: timestamp("approved_at"),
    rejectedAt: timestamp("rejected_at"),
    closedAt: timestamp("closed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    statusCreatedIndex: index("member_message_requests_status_created_idx").on(table.status, table.createdAt),
  }),
);

export const memberMessageRelays = pgTable(
  "member_message_relays",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id").notNull(),
    direction: varchar("direction", { length: 40 }).notNull(),
    fromRole: varchar("from_role", { length: 40 }).notNull(),
    toRole: varchar("to_role", { length: 40 }).notNull(),
    toEmail: varchar("to_email", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 255 }).notNull().default(""),
    message: text("message").notNull(),
    deliveryStatus: varchar("delivery_status", { length: 40 }).notNull().default("queued"),
    errorMessage: varchar("error_message", { length: 512 }).notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    requestCreatedIndex: index("member_message_relays_request_created_idx").on(table.requestId, table.createdAt),
  }),
);

export const householdAccessTokens = pgTable(
  "household_access_tokens",
  {
    id: serial("id").primaryKey(),
    householdId: integer("household_id").notNull(),
    tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),
    purpose: varchar("purpose", { length: 40 }).notNull().default("renewal"),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    householdPurposeIndex: index("household_access_tokens_household_purpose_idx").on(
      table.householdId,
      table.purpose,
    ),
  }),
);

export const kosherPlaces = pgTable("kosher_places", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  path: varchar("path", { length: 512 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  neighborhood: varchar("neighborhood", { length: 80 }).notNull(),
  neighborhoodLabel: varchar("neighborhood_label", { length: 120 }).notNull(),
  tags: json("tags").$type<string[]>().notNull(),
  categoryPaths: json("category_paths").$type<string[]>().notNull(),
  tagPaths: json("tag_paths").$type<string[]>().notNull(),
  address: text("address").notNull().default(""),
  phone: varchar("phone", { length: 40 }).notNull().default(""),
  website: text("website").notNull().default(""),
  supervision: text("supervision").notNull().default(""),
  summary: text("summary").notNull().default(""),
  locationHref: text("location_href").notNull().default(""),
  sourceCapturedAt: timestamp("source_captured_at"),
  sourceType: varchar("source_type", { length: 40 }).notNull().default("mirror"),
  sourceJson: json("source_json").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pageFreshness = pgTable("page_freshness", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 120 }).notNull().unique(),
  lastUpdatedAt: timestamp("last_updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const newsletterTemplates = pgTable("newsletter_templates", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull().default(""),
  parshaName: varchar("parsha_name", { length: 120 }).notNull().default(""),
  shabbatDate: varchar("shabbat_date", { length: 120 }).notNull().default(""),
  hebrewDate: varchar("hebrew_date", { length: 120 }).notNull().default(""),
  candleLighting: varchar("candle_lighting", { length: 60 }).notNull().default(""),
  bodyHtml: text("body_html").notNull().default(""),
  status: templateStatusEnum("status").notNull().default("draft"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const inTheNews = pgTable("in_the_news", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  path: varchar("path", { length: 512 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  publishedLabel: varchar("published_label", { length: 160 }).notNull().default(""),
  publishedAt: timestamp("published_at"),
  year: integer("year"),
  author: varchar("author", { length: 255 }).notNull().default(""),
  publication: varchar("publication", { length: 255 }).notNull().default(""),
  excerpt: text("excerpt").notNull().default(""),
  bodyText: text("body_text").notNull().default(""),
  sourceUrl: text("source_url").notNull().default(""),
  sourceCapturedAt: timestamp("source_captured_at"),
  sourceType: varchar("source_type", { length: 40 }).notNull().default("mirror"),
  sourceJson: json("source_json").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
