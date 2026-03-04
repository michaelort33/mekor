import {
  boolean,
  date,
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
export const userRoleEnum = pgEnum("user_role", ["visitor", "member", "admin", "super_admin"]);
export const profileVisibilityEnum = pgEnum("profile_visibility", ["private", "members", "public", "anonymous"]);
export const duesFrequencyEnum = pgEnum("dues_frequency", ["annual", "monthly", "custom"]);
export const duesInvoiceStatusEnum = pgEnum("dues_invoice_status", ["open", "paid", "void", "overdue"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "succeeded", "failed", "refunded"]);
export const eventRegistrationStatusEnum = pgEnum("event_registration_status", [
  "registered",
  "waitlisted",
  "cancelled",
  "payment_pending",
]);
export const duesReminderTypeEnum = pgEnum("dues_reminder_type", ["d30", "d7", "d1", "overdue_weekly"]);
export const eventReminderTypeEnum = pgEnum("event_reminder_type", ["event_24h"]);

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

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    bio: text("bio").notNull().default(""),
    city: varchar("city", { length: 120 }).notNull().default(""),
    avatarUrl: text("avatar_url").notNull().default(""),
    role: userRoleEnum("role").notNull().default("visitor"),
    profileVisibility: profileVisibilityEnum("profile_visibility").notNull().default("private"),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    directoryRoleVisibilityDisplayNameIdx: index("users_directory_role_visibility_display_name_idx").on(
      table.role,
      table.profileVisibility,
      table.displayName,
    ),
  }),
);

export const stripeCustomers = pgTable("stripe_customers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id)
    .unique(),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const duesSchedules = pgTable(
  "dues_schedules",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    frequency: duesFrequencyEnum("frequency").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("usd"),
    nextDueDate: date("next_due_date").notNull(),
    active: boolean("active").notNull().default(true),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userDueDateIdx: index("dues_schedules_user_due_date_idx").on(table.userId, table.nextDueDate),
  }),
);

export const duesInvoices = pgTable(
  "dues_invoices",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    scheduleId: integer("schedule_id").references(() => duesSchedules.id),
    label: varchar("label", { length: 160 }).notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("usd"),
    dueDate: date("due_date").notNull(),
    status: duesInvoiceStatusEnum("status").notNull().default("open"),
    paidAt: timestamp("paid_at"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeReceiptUrl: text("stripe_receipt_url").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userStatusDueDateIdx: index("dues_invoices_user_status_due_date_idx").on(table.userId, table.status, table.dueDate),
  }),
);

export const duesPayments = pgTable(
  "dues_payments",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    invoiceId: integer("invoice_id")
      .notNull()
      .references(() => duesInvoices.id),
    amountCents: integer("amount_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("usd"),
    status: paymentStatusEnum("status").notNull(),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeReceiptUrl: text("stripe_receipt_url").notNull().default(""),
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    invoiceStatusIdx: index("dues_payments_invoice_status_idx").on(table.invoiceId, table.status),
  }),
);

export const eventSignupSettings = pgTable(
  "event_signup_settings",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id)
      .unique(),
    enabled: boolean("enabled").notNull().default(false),
    capacity: integer("capacity"),
    waitlistEnabled: boolean("waitlist_enabled").notNull().default(true),
    paymentRequired: boolean("payment_required").notNull().default(false),
    registrationDeadline: timestamp("registration_deadline"),
    organizerEmail: varchar("organizer_email", { length: 255 }).notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    enabledDeadlineIdx: index("event_signup_settings_enabled_deadline_idx").on(table.enabled, table.registrationDeadline),
  }),
);

export const eventTicketTiers = pgTable(
  "event_ticket_tiers",
  {
    id: serial("id").primaryKey(),
    eventSignupSettingsId: integer("event_signup_settings_id")
      .notNull()
      .references(() => eventSignupSettings.id),
    name: varchar("name", { length: 120 }).notNull(),
    priceCents: integer("price_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("usd"),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    settingsSortIdx: index("event_ticket_tiers_settings_sort_idx").on(table.eventSignupSettingsId, table.sortOrder),
  }),
);

export const eventRegistrations = pgTable(
  "event_registrations",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    ticketTierId: integer("ticket_tier_id").references(() => eventTicketTiers.id),
    status: eventRegistrationStatusEnum("status").notNull(),
    paymentDueAt: timestamp("payment_due_at"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    receiptUrl: text("receipt_url").notNull().default(""),
    registeredAt: timestamp("registered_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    eventUserUniqueIdx: uniqueIndex("event_registrations_event_user_unique_idx").on(table.eventId, table.userId),
    eventStatusRegisteredAtIdx: index("event_registrations_event_status_registered_at_idx").on(
      table.eventId,
      table.status,
      table.registeredAt,
    ),
  }),
);

export const eventOrganizerMessages = pgTable("event_organizer_messages", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  subject: varchar("subject", { length: 160 }).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const duesReminderLog = pgTable(
  "dues_reminder_log",
  {
    id: serial("id").primaryKey(),
    invoiceId: integer("invoice_id")
      .notNull()
      .references(() => duesInvoices.id),
    reminderType: duesReminderTypeEnum("reminder_type").notNull(),
    sentAt: timestamp("sent_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    invoiceReminderUniqueIdx: uniqueIndex("dues_reminder_log_invoice_reminder_type_idx").on(
      table.invoiceId,
      table.reminderType,
    ),
  }),
);

export const eventReminderLog = pgTable(
  "event_reminder_log",
  {
    id: serial("id").primaryKey(),
    registrationId: integer("registration_id")
      .notNull()
      .references(() => eventRegistrations.id),
    reminderType: eventReminderTypeEnum("reminder_type").notNull(),
    sentAt: timestamp("sent_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    registrationReminderTypeIdx: uniqueIndex("event_reminder_log_registration_reminder_type_idx").on(
      table.registrationId,
      table.reminderType,
    ),
  }),
);

export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 120 }).notNull().unique(),
  value: text("value").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  description: text("description").notNull().default(""),
  settingType: varchar("setting_type", { length: 40 }).notNull().default("boolean"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userInvitations = pgTable(
  "user_invitations",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    role: userRoleEnum("role").notNull().default("visitor"),
    invitedByUserId: integer("invited_by_user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    tokenHashUniqueIdx: uniqueIndex("user_invitations_token_hash_unique_idx").on(table.tokenHash),
    emailStateIdx: index("user_invitations_email_accepted_revoked_idx").on(table.email, table.acceptedAt, table.revokedAt),
    expiresAtIdx: index("user_invitations_expires_at_idx").on(table.expiresAt),
  }),
);

export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: serial("id").primaryKey(),
    actorUserId: integer("actor_user_id")
      .notNull()
      .references(() => users.id),
    action: varchar("action", { length: 120 }).notNull(),
    targetType: varchar("target_type", { length: 80 }).notNull(),
    targetId: varchar("target_id", { length: 120 }).notNull(),
    payloadJson: json("payload_json").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    actorActionIdx: index("admin_audit_log_actor_action_idx").on(table.actorUserId, table.action),
  }),
);
