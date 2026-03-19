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
export const newsletterRecipientGroupEnum = pgEnum("newsletter_recipient_group", [
  "all_members",
  "admins_only",
  "dues_outstanding",
  "directory_visible",
]);
export const newsletterCampaignStatusEnum = pgEnum("newsletter_campaign_status", [
  "sending",
  "completed",
  "partial",
  "failed",
]);
export const newsletterDeliveryStatusEnum = pgEnum("newsletter_delivery_status", ["sent", "failed"]);
export const userRoleEnum = pgEnum("user_role", ["visitor", "member", "admin", "super_admin"]);
export const profileVisibilityEnum = pgEnum("profile_visibility", ["private", "members", "public", "anonymous"]);
export const duesFrequencyEnum = pgEnum("dues_frequency", ["annual", "monthly", "custom"]);
export const duesInvoiceStatusEnum = pgEnum("dues_invoice_status", ["open", "paid", "void", "overdue"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "succeeded", "failed", "refunded"]);
export const duesNotificationTypeEnum = pgEnum("dues_notification_type", [
  "invoice_created",
  "payment_succeeded",
  "payment_failed",
  "overdue_d30",
  "overdue_d7",
  "overdue_d1",
  "overdue_weekly",
]);
export const duesNotificationDeliveryStatusEnum = pgEnum("dues_notification_delivery_status", ["sent", "failed"]);
export const automatedMessageTypeEnum = pgEnum("automated_message_type", ["membership_renewal_reminder"]);
export const automatedMessageDeliveryStatusEnum = pgEnum("automated_message_delivery_status", ["sent", "failed"]);
export const eventRegistrationStatusEnum = pgEnum("event_registration_status", [
  "registered",
  "waitlisted",
  "cancelled",
  "payment_pending",
]);
export const duesReminderTypeEnum = pgEnum("dues_reminder_type", ["d30", "d7", "d1", "overdue_weekly"]);
export const eventReminderTypeEnum = pgEnum("event_reminder_type", ["event_24h"]);
export const memberEventJoinModeEnum = pgEnum("member_event_join_mode", ["open_join", "request_to_join"]);
export const memberEventVisibilityEnum = pgEnum("member_event_visibility", ["members_only", "public"]);
export const memberEventStatusEnum = pgEnum("member_event_status", ["draft", "published", "cancelled", "completed"]);
export const memberEventAttendeeStatusEnum = pgEnum("member_event_attendee_status", [
  "requested",
  "approved",
  "rejected",
  "cancelled",
  "waitlisted",
]);
export const familyStatusEnum = pgEnum("family_status", ["active", "archived"]);
export const familyRoleInFamilyEnum = pgEnum("family_role_in_family", [
  "primary_adult",
  "adult",
  "child",
  "dependent",
]);
export const familyMembershipStatusEnum = pgEnum("family_membership_status", ["pending", "active", "former"]);
export const familyInviteStatusEnum = pgEnum("family_invite_status", [
  "pending",
  "accepted",
  "declined",
  "expired",
  "revoked",
]);
export const familyJoinRequestStatusEnum = pgEnum("family_join_request_status", [
  "pending",
  "accepted",
  "declined",
  "revoked",
]);
export const inboxThreadTypeEnum = pgEnum("inbox_thread_type", ["family_invite", "family_chat", "direct", "system"]);
export const inboxMessageTypeEnum = pgEnum("inbox_message_type", ["text", "system", "action"]);
export const notificationChannelEnum = pgEnum("notification_channel", ["email", "sms", "push"]);
export const notificationsOutboxStatusEnum = pgEnum("notifications_outbox_status", ["queued", "sent", "failed"]);
export const peopleStatusEnum = pgEnum("people_status", [
  "lead",
  "invited",
  "visitor",
  "guest",
  "member",
  "admin",
  "super_admin",
  "inactive",
]);
export const contactMethodTypeEnum = pgEnum("contact_method_type", ["email", "phone", "whatsapp"]);
export const communicationPreferredChannelEnum = pgEnum("communication_preferred_channel", ["email", "sms", "whatsapp"]);
export const paymentSourceEnum = pgEnum("payment_source", [
  "stripe",
  "paypal",
  "zelle",
  "flipcause",
  "network_for_good",
  "chesed",
  "manual",
  "other",
]);
export const paymentKindEnum = pgEnum("payment_kind", [
  "donation",
  "membership_dues",
  "campaign_donation",
  "event",
  "goods_services",
  "other",
]);
export const paymentClassificationStatusEnum = pgEnum("payment_classification_status", [
  "unreconciled",
  "auto_matched",
  "manually_matched",
]);
export const taxDeductibilityEnum = pgEnum("tax_deductibility", [
  "deductible",
  "partially_deductible",
  "non_deductible",
]);
export const paymentCampaignStatusEnum = pgEnum("payment_campaign_status", ["draft", "active", "closed", "archived"]);
export const taxDocumentTypeEnum = pgEnum("tax_document_type", ["receipt", "year_end_letter"]);
export const membershipPipelineEventTypeEnum = pgEnum("membership_pipeline_event_type", [
  "lead_created",
  "tour_attended",
  "invited",
  "joined",
  "renewed",
  "churned",
  "status_changed",
  "note",
]);
export const membershipApplicationStatusEnum = pgEnum("membership_application_status", ["pending", "approved", "declined"]);
export const messageCampaignChannelEnum = pgEnum("message_campaign_channel", ["email", "sms", "whatsapp"]);
export const messageCampaignSourceEnum = pgEnum("message_campaign_source", ["manual", "newsletter", "automated"]);
export const messageCampaignStatusEnum = pgEnum("message_campaign_status", ["sending", "completed", "partial", "failed"]);
export const messageDeliveryStatusEnum = pgEnum("message_delivery_status", ["queued", "sent", "failed", "skipped"]);
export const adminNotificationCategoryEnum = pgEnum("admin_notification_category", [
  "general_forms",
  "volunteer",
  "kosher",
  "davening",
  "kiddush",
  "auxiliary_membership",
  "newsletter_signup",
]);
export const adminInboxEventSourceTypeEnum = pgEnum("admin_inbox_event_source_type", [
  "form_submission",
  "mailchimp_signup",
]);
export const adminInboxEventStatusEnum = pgEnum("admin_inbox_event_status", ["new", "read", "archived"]);
export const mailchimpSignupEventTypeEnum = pgEnum("mailchimp_signup_event_type", [
  "subscribe",
  "profile",
  "upemail",
  "cleaned",
  "unsubscribe",
]);
export const askMekorQuestionVisibilityEnum = pgEnum("ask_mekor_question_visibility", ["public", "private"]);
export const askMekorQuestionStatusEnum = pgEnum("ask_mekor_question_status", ["open", "answered", "closed"]);

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

export const adminInboxEvents = pgTable(
  "admin_inbox_events",
  {
    id: serial("id").primaryKey(),
    sourceType: adminInboxEventSourceTypeEnum("source_type").notNull(),
    category: adminNotificationCategoryEnum("category").notNull(),
    sourceId: varchar("source_id", { length: 80 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    submitterName: varchar("submitter_name", { length: 120 }).notNull().default(""),
    submitterEmail: varchar("submitter_email", { length: 255 }).notNull().default(""),
    submitterPhone: varchar("submitter_phone", { length: 60 }).notNull().default(""),
    summary: text("summary").notNull().default(""),
    payloadJson: json("payload_json").$type<Record<string, unknown>>().notNull().default({}),
    status: adminInboxEventStatusEnum("status").notNull().default("new"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    categoryStatusCreatedIdx: index("admin_inbox_events_category_status_created_idx").on(
      table.category,
      table.status,
      table.createdAt,
    ),
    sourceTypeSourceIdIdx: uniqueIndex("admin_inbox_events_source_type_source_id_unique_idx").on(
      table.sourceType,
      table.sourceId,
    ),
    statusCreatedIdx: index("admin_inbox_events_status_created_idx").on(table.status, table.createdAt),
  }),
);

export const askMekorCategories = pgTable(
  "ask_mekor_categories",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 80 }).notNull(),
    label: varchar("label", { length: 120 }).notNull(),
    description: text("description").notNull().default(""),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    slugUniqueIdx: uniqueIndex("ask_mekor_categories_slug_unique_idx").on(table.slug),
    positionIdx: index("ask_mekor_categories_position_idx").on(table.position),
  }),
);

export const askMekorQuestions = pgTable(
  "ask_mekor_questions",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => askMekorCategories.id),
    visibility: askMekorQuestionVisibilityEnum("visibility").notNull().default("public"),
    status: askMekorQuestionStatusEnum("status").notNull().default("open"),
    slug: varchar("slug", { length: 200 }).notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    body: text("body").notNull(),
    askerUserId: integer("asker_user_id").references(() => users.id),
    askerName: varchar("asker_name", { length: 120 }).notNull().default(""),
    askerEmail: varchar("asker_email", { length: 255 }).notNull().default(""),
    askerPhone: varchar("asker_phone", { length: 60 }).notNull().default(""),
    sourcePath: varchar("source_path", { length: 512 }).notNull().default("/ask-mekor"),
    linkedThreadId: integer("linked_thread_id").references(() => inboxThreads.id),
    answeredAt: timestamp("answered_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    slugUniqueIdx: uniqueIndex("ask_mekor_questions_slug_unique_idx").on(table.slug),
    visibilityStatusUpdatedIdx: index("ask_mekor_questions_visibility_status_updated_idx").on(
      table.visibility,
      table.status,
      table.updatedAt,
    ),
    categoryUpdatedIdx: index("ask_mekor_questions_category_updated_idx").on(table.categoryId, table.updatedAt),
    askerEmailCreatedIdx: index("ask_mekor_questions_asker_email_created_idx").on(table.askerEmail, table.createdAt),
    linkedThreadIdx: uniqueIndex("ask_mekor_questions_linked_thread_unique_idx").on(table.linkedThreadId),
  }),
);

export const askMekorReplies = pgTable(
  "ask_mekor_replies",
  {
    id: serial("id").primaryKey(),
    questionId: integer("question_id")
      .notNull()
      .references(() => askMekorQuestions.id),
    authorUserId: integer("author_user_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    questionCreatedIdx: index("ask_mekor_replies_question_created_idx").on(table.questionId, table.createdAt),
  }),
);

export const mailchimpSignupEvents = pgTable(
  "mailchimp_signup_events",
  {
    id: serial("id").primaryKey(),
    eventKey: varchar("event_key", { length: 255 }).notNull().unique(),
    listId: varchar("list_id", { length: 120 }).notNull().default(""),
    eventType: mailchimpSignupEventTypeEnum("event_type").notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    firstName: varchar("first_name", { length: 120 }).notNull().default(""),
    lastName: varchar("last_name", { length: 120 }).notNull().default(""),
    payloadJson: json("payload_json").$type<Record<string, unknown>>().notNull().default({}),
    occurredAt: timestamp("occurred_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    listEventOccurredIdx: index("mailchimp_signup_events_list_event_occurred_idx").on(
      table.listId,
      table.eventType,
      table.occurredAt,
    ),
    emailOccurredIdx: index("mailchimp_signup_events_email_occurred_idx").on(table.email, table.occurredAt),
  }),
);

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
    membershipStartDate: date("membership_start_date"),
    membershipRenewalDate: date("membership_renewal_date"),
    autoMessagesEnabled: boolean("auto_messages_enabled").notNull().default(true),
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
    createdAtIdIdx: index("users_created_at_id_idx").on(table.createdAt, table.id),
    renewalAutoMessagesIdx: index("users_renewal_auto_messages_idx").on(table.membershipRenewalDate, table.autoMessagesEnabled),
  }),
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    tokenHashUniqueIdx: uniqueIndex("password_reset_tokens_token_hash_unique_idx").on(table.tokenHash),
    userStateExpiresIdx: index("password_reset_tokens_user_used_expires_idx").on(table.userId, table.usedAt, table.expiresAt),
    expiresAtIdx: index("password_reset_tokens_expires_at_idx").on(table.expiresAt),
  }),
);

export const adminNotificationPreferences = pgTable(
  "admin_notification_preferences",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    category: adminNotificationCategoryEnum("category").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userCategoryUniqueIdx: uniqueIndex("admin_notification_preferences_user_category_unique_idx").on(
      table.userId,
      table.category,
    ),
    categoryEnabledIdx: index("admin_notification_preferences_category_enabled_idx").on(table.category, table.enabled),
  }),
);

export const people = pgTable(
  "people",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id).unique(),
    status: peopleStatusEnum("status").notNull().default("lead"),
    firstName: varchar("first_name", { length: 120 }).notNull().default(""),
    lastName: varchar("last_name", { length: 120 }).notNull().default(""),
    displayName: varchar("display_name", { length: 160 }).notNull().default(""),
    email: varchar("email", { length: 255 }).notNull().default(""),
    phone: varchar("phone", { length: 60 }).notNull().default(""),
    city: varchar("city", { length: 120 }).notNull().default(""),
    notes: text("notes").notNull().default(""),
    source: varchar("source", { length: 120 }).notNull().default(""),
    tags: json("tags").$type<string[]>().notNull().default([]),
    invitedAt: timestamp("invited_at"),
    joinedAt: timestamp("joined_at"),
    lastContactedAt: timestamp("last_contacted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    emailUniqueIdx: uniqueIndex("people_email_unique_idx").on(table.email),
    statusCreatedAtIdx: index("people_status_created_at_idx").on(table.status, table.createdAt),
    userStatusIdx: index("people_user_status_idx").on(table.userId, table.status),
    createdAtIdIdx: index("people_created_at_id_idx").on(table.createdAt, table.id),
  }),
);

export const contactMethods = pgTable(
  "contact_methods",
  {
    id: serial("id").primaryKey(),
    personId: integer("person_id")
      .notNull()
      .references(() => people.id),
    type: contactMethodTypeEnum("type").notNull(),
    value: varchar("value", { length: 255 }).notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    verifiedAt: timestamp("verified_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    personTypePrimaryIdx: index("contact_methods_person_type_primary_idx").on(table.personId, table.type, table.isPrimary),
    personTypeValueUniqueIdx: uniqueIndex("contact_methods_person_type_value_unique_idx").on(table.personId, table.type, table.value),
  }),
);

export const communicationPreferences = pgTable(
  "communication_preferences",
  {
    id: serial("id").primaryKey(),
    personId: integer("person_id")
      .notNull()
      .references(() => people.id)
      .unique(),
    emailOptIn: boolean("email_opt_in").notNull().default(true),
    smsOptIn: boolean("sms_opt_in").notNull().default(false),
    whatsappOptIn: boolean("whatsapp_opt_in").notNull().default(false),
    doNotContact: boolean("do_not_contact").notNull().default(false),
    quietHoursStart: varchar("quiet_hours_start", { length: 5 }).notNull().default(""),
    quietHoursEnd: varchar("quiet_hours_end", { length: 5 }).notNull().default(""),
    preferredChannel: communicationPreferredChannelEnum("preferred_channel").notNull().default("email"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    contactFlagsIdx: index("communication_preferences_contact_flags_idx").on(
      table.doNotContact,
      table.emailOptIn,
      table.smsOptIn,
      table.whatsappOptIn,
    ),
  }),
);

export const membershipPipelineEvents = pgTable(
  "membership_pipeline_events",
  {
    id: serial("id").primaryKey(),
    personId: integer("person_id")
      .notNull()
      .references(() => people.id),
    actorUserId: integer("actor_user_id").references(() => users.id),
    eventType: membershipPipelineEventTypeEnum("event_type").notNull(),
    summary: varchar("summary", { length: 255 }).notNull().default(""),
    payloadJson: json("payload_json").$type<Record<string, unknown>>().notNull().default({}),
    occurredAt: timestamp("occurred_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    personOccurredAtIdx: index("membership_pipeline_events_person_occurred_at_idx").on(table.personId, table.occurredAt),
    eventTypeOccurredAtIdx: index("membership_pipeline_events_type_occurred_at_idx").on(table.eventType, table.occurredAt),
  }),
);

export const families = pgTable(
  "families",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull().unique(),
    createdByUserId: integer("created_by_user_id")
      .notNull()
      .references(() => users.id),
    status: familyStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    statusCreatedAtIdx: index("families_status_created_at_idx").on(table.status, table.createdAt),
  }),
);

export const familyMembers = pgTable(
  "family_members",
  {
    id: serial("id").primaryKey(),
    familyId: integer("family_id")
      .notNull()
      .references(() => families.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    roleInFamily: familyRoleInFamilyEnum("role_in_family").notNull().default("adult"),
    membershipStatus: familyMembershipStatusEnum("membership_status").notNull().default("active"),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    familyUserUniqueIdx: uniqueIndex("family_members_family_user_unique_idx").on(table.familyId, table.userId),
    userStatusFamilyIdx: index("family_members_user_status_family_idx").on(
      table.userId,
      table.membershipStatus,
      table.familyId,
    ),
    familyStatusRoleIdx: index("family_members_family_status_role_idx").on(
      table.familyId,
      table.membershipStatus,
      table.roleInFamily,
    ),
  }),
);

export const inboxThreads = pgTable(
  "inbox_threads",
  {
    id: serial("id").primaryKey(),
    type: inboxThreadTypeEnum("type").notNull(),
    subject: varchar("subject", { length: 180 }).notNull().default(""),
    familyId: integer("family_id").references(() => families.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    familyTypeIdx: index("inbox_threads_family_type_idx").on(table.familyId, table.type),
  }),
);

export const familyInvites = pgTable(
  "family_invites",
  {
    id: serial("id").primaryKey(),
    familyId: integer("family_id")
      .notNull()
      .references(() => families.id),
    threadId: integer("thread_id")
      .notNull()
      .references(() => inboxThreads.id),
    inviterUserId: integer("inviter_user_id")
      .notNull()
      .references(() => users.id),
    inviteeUserId: integer("invitee_user_id").references(() => users.id),
    inviteeEmail: varchar("invitee_email", { length: 255 }),
    inviteeFirstName: varchar("invitee_first_name", { length: 120 }).notNull().default(""),
    inviteeLastName: varchar("invitee_last_name", { length: 120 }).notNull().default(""),
    roleInFamily: familyRoleInFamilyEnum("role_in_family").notNull().default("adult"),
    contactRequired: boolean("contact_required").notNull().default(false),
    tokenHash: text("token_hash").notNull(),
    status: familyInviteStatusEnum("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    tokenHashUniqueIdx: uniqueIndex("family_invites_token_hash_unique_idx").on(table.tokenHash),
    familyInviteeEmailStatusUniqueIdx: uniqueIndex("family_invites_family_invitee_email_status_unique_idx").on(
      table.familyId,
      table.inviteeEmail,
      table.status,
    ),
    familyInviteeStatusIdx: index("family_invites_family_invitee_status_idx").on(
      table.familyId,
      table.inviteeUserId,
      table.status,
    ),
    inviteeEmailStatusIdx: index("family_invites_invitee_email_status_idx").on(table.inviteeEmail, table.status),
    expiresAtIdx: index("family_invites_expires_at_idx").on(table.expiresAt),
  }),
);

export const familyJoinRequests = pgTable(
  "family_join_requests",
  {
    id: serial("id").primaryKey(),
    familyId: integer("family_id")
      .notNull()
      .references(() => families.id),
    requestorUserId: integer("requestor_user_id")
      .notNull()
      .references(() => users.id),
    requestedRoleInFamily: familyRoleInFamilyEnum("requested_role_in_family").notNull().default("adult"),
    status: familyJoinRequestStatusEnum("status").notNull().default("pending"),
    respondedByUserId: integer("responded_by_user_id").references(() => users.id),
    respondedAt: timestamp("responded_at"),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    familyRequestorStatusIdx: index("family_join_requests_family_requestor_status_idx").on(
      table.familyId,
      table.requestorUserId,
      table.status,
    ),
  }),
);

export const inboxParticipants = pgTable(
  "inbox_participants",
  {
    id: serial("id").primaryKey(),
    threadId: integer("thread_id")
      .notNull()
      .references(() => inboxThreads.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    lastReadAt: timestamp("last_read_at"),
    muted: boolean("muted").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    threadUserUniqueIdx: uniqueIndex("inbox_participants_thread_user_unique_idx").on(table.threadId, table.userId),
    userThreadIdx: index("inbox_participants_user_thread_idx").on(table.userId, table.threadId),
  }),
);

export const inboxMessages = pgTable(
  "inbox_messages",
  {
    id: serial("id").primaryKey(),
    threadId: integer("thread_id")
      .notNull()
      .references(() => inboxThreads.id),
    senderUserId: integer("sender_user_id").references(() => users.id),
    messageType: inboxMessageTypeEnum("message_type").notNull().default("text"),
    body: text("body").notNull().default(""),
    actionPayloadJson: json("action_payload_json").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    threadCreatedAtIdx: index("inbox_messages_thread_created_at_idx").on(table.threadId, table.createdAt),
  }),
);

export const notificationsOutbox = pgTable(
  "notifications_outbox",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id),
    threadId: integer("thread_id").references(() => inboxThreads.id),
    channel: notificationChannelEnum("channel").notNull().default("email"),
    toAddress: varchar("to_address", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 255 }).notNull().default(""),
    body: text("body").notNull().default(""),
    provider: varchar("provider", { length: 60 }).notNull().default("sendgrid"),
    providerMessageId: varchar("provider_message_id", { length: 255 }).notNull().default(""),
    status: notificationsOutboxStatusEnum("status").notNull().default("queued"),
    errorMessage: text("error_message").notNull().default(""),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    statusCreatedAtIdx: index("notifications_outbox_status_created_at_idx").on(table.status, table.createdAt),
    userCreatedAtIdx: index("notifications_outbox_user_created_at_idx").on(table.userId, table.createdAt),
  }),
);

export const newsletterCampaigns = pgTable(
  "newsletter_campaigns",
  {
    id: serial("id").primaryKey(),
    templateId: integer("template_id")
      .notNull()
      .references(() => newsletterTemplates.id),
    sentByUserId: integer("sent_by_user_id")
      .notNull()
      .references(() => users.id),
    recipientGroup: newsletterRecipientGroupEnum("recipient_group").notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    senderEmail: varchar("sender_email", { length: 255 }).notNull(),
    recipientCount: integer("recipient_count").notNull().default(0),
    successCount: integer("success_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    status: newsletterCampaignStatusEnum("status").notNull().default("sending"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    templateStartedIdx: index("newsletter_campaigns_template_started_idx").on(table.templateId, table.startedAt),
    senderStartedIdx: index("newsletter_campaigns_sender_started_idx").on(table.sentByUserId, table.startedAt),
  }),
);

export const newsletterCampaignDeliveries = pgTable(
  "newsletter_campaign_deliveries",
  {
    id: serial("id").primaryKey(),
    campaignId: integer("campaign_id")
      .notNull()
      .references(() => newsletterCampaigns.id),
    templateId: integer("template_id")
      .notNull()
      .references(() => newsletterTemplates.id),
    recipientUserId: integer("recipient_user_id").references(() => users.id),
    recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
    recipientName: varchar("recipient_name", { length: 120 }).notNull().default(""),
    status: newsletterDeliveryStatusEnum("status").notNull(),
    provider: varchar("provider", { length: 40 }).notNull().default("sendgrid"),
    providerMessageId: varchar("provider_message_id", { length: 255 }).notNull().default(""),
    errorMessage: text("error_message").notNull().default(""),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    campaignStatusIdx: index("newsletter_campaign_deliveries_campaign_status_idx").on(table.campaignId, table.status),
    templateCreatedIdx: index("newsletter_campaign_deliveries_template_created_idx").on(table.templateId, table.createdAt),
    recipientEmailIdx: index("newsletter_campaign_deliveries_recipient_email_idx").on(table.recipientEmail),
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
    updatedAtIdIdx: index("dues_schedules_updated_at_id_idx").on(table.updatedAt, table.id),
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
    dueDateIdIdx: index("dues_invoices_due_date_id_idx").on(table.dueDate, table.id),
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

export const duesNotificationLog = pgTable(
  "dues_notification_log",
  {
    id: serial("id").primaryKey(),
    referenceKey: varchar("reference_key", { length: 255 }).notNull().unique(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    invoiceId: integer("invoice_id").references(() => duesInvoices.id),
    paymentId: integer("payment_id").references(() => duesPayments.id),
    notificationType: duesNotificationTypeEnum("notification_type").notNull(),
    provider: varchar("provider", { length: 40 }).notNull().default("sendgrid"),
    providerMessageId: varchar("provider_message_id", { length: 255 }).notNull().default(""),
    deliveryStatus: duesNotificationDeliveryStatusEnum("delivery_status").notNull(),
    errorMessage: text("error_message").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    invoiceTypeIdx: index("dues_notification_log_invoice_type_idx").on(table.invoiceId, table.notificationType),
    paymentTypeIdx: index("dues_notification_log_payment_type_idx").on(table.paymentId, table.notificationType),
  }),
);

export const automatedMessageLog = pgTable(
  "automated_message_log",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    messageType: automatedMessageTypeEnum("message_type").notNull(),
    membershipRenewalDate: date("membership_renewal_date").notNull(),
    recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    body: text("body").notNull(),
    provider: varchar("provider", { length: 40 }).notNull().default("sendgrid"),
    providerMessageId: varchar("provider_message_id", { length: 255 }).notNull().default(""),
    deliveryStatus: automatedMessageDeliveryStatusEnum("delivery_status").notNull(),
    errorMessage: text("error_message").notNull().default(""),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userTypeRenewalUniqueIdx: uniqueIndex("automated_message_log_user_type_renewal_unique_idx").on(
      table.userId,
      table.messageType,
      table.membershipRenewalDate,
    ),
    createdAtIdIdx: index("automated_message_log_created_at_id_idx").on(table.createdAt, table.id),
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
    shareInFeed: boolean("share_in_feed").notNull().default(false),
    signupComment: text("signup_comment").notNull().default(""),
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
    eventSharedRegisteredAtIdx: index("event_registrations_event_shared_registered_at_idx").on(
      table.eventId,
      table.shareInFeed,
      table.registeredAt,
    ),
    registeredAtIdIdx: index("event_registrations_registered_at_id_idx").on(table.registeredAt, table.id),
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

export const memberEvents = pgTable(
  "member_events",
  {
    id: serial("id").primaryKey(),
    hostUserId: integer("host_user_id")
      .notNull()
      .references(() => users.id),
    title: varchar("title", { length: 160 }).notNull(),
    description: text("description").notNull().default(""),
    startsAt: timestamp("starts_at").notNull(),
    endsAt: timestamp("ends_at"),
    location: varchar("location", { length: 255 }).notNull().default(""),
    capacity: integer("capacity"),
    joinMode: memberEventJoinModeEnum("join_mode").notNull().default("open_join"),
    visibility: memberEventVisibilityEnum("visibility").notNull().default("members_only"),
    status: memberEventStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    startsAtIdx: index("member_events_starts_at_idx").on(table.startsAt),
    hostStatusIdx: index("member_events_host_status_idx").on(table.hostUserId, table.status),
    statusVisibilityStartsAtIdx: index("member_events_status_visibility_starts_at_idx").on(
      table.status,
      table.visibility,
      table.startsAt,
    ),
  }),
);

export const memberEventAttendees = pgTable(
  "member_event_attendees",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
      .notNull()
      .references(() => memberEvents.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    status: memberEventAttendeeStatusEnum("status").notNull(),
    requestedAt: timestamp("requested_at").defaultNow().notNull(),
    respondedAt: timestamp("responded_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    eventUserUniqueIdx: uniqueIndex("member_event_attendees_event_user_unique_idx").on(table.eventId, table.userId),
    eventStatusRequestedIdx: index("member_event_attendees_event_status_requested_idx").on(
      table.eventId,
      table.status,
      table.requestedAt,
    ),
    userStatusRequestedIdx: index("member_event_attendees_user_status_requested_idx").on(
      table.userId,
      table.status,
      table.requestedAt,
    ),
  }),
);

export const memberEventActivityLog = pgTable(
  "member_event_activity_log",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
      .notNull()
      .references(() => memberEvents.id),
    actorUserId: integer("actor_user_id").references(() => users.id),
    attendeeId: integer("attendee_id").references(() => memberEventAttendees.id),
    action: varchar("action", { length: 120 }).notNull(),
    payloadJson: json("payload_json").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    eventActionIdx: index("member_event_activity_log_event_action_idx").on(table.eventId, table.action),
    eventCreatedAtIdx: index("member_event_activity_log_event_created_at_idx").on(table.eventId, table.createdAt),
  }),
);

export const memberEventComments = pgTable(
  "member_event_comments",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
      .notNull()
      .references(() => memberEvents.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    eventCreatedAtIdx: index("member_event_comments_event_created_at_idx").on(table.eventId, table.createdAt),
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
    personId: integer("person_id").references(() => people.id),
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
    createdAtIdIdx: index("user_invitations_created_at_id_idx").on(table.createdAt, table.id),
    personEmailStateIdx: index("user_invitations_person_email_state_idx").on(table.personId, table.email, table.acceptedAt),
  }),
);

export const membershipApplications = pgTable(
  "membership_applications",
  {
    id: serial("id").primaryKey(),
    status: membershipApplicationStatusEnum("status").notNull().default("pending"),
    applicationType: varchar("application_type", { length: 40 }).notNull(),
    membershipCategory: varchar("membership_category", { length: 40 }).notNull(),
    preferredPaymentMethod: varchar("preferred_payment_method", { length: 40 }).notNull().default("undecided"),
    includeSecurityDonation: boolean("include_security_donation").notNull().default(true),
    coverOnlineFees: boolean("cover_online_fees").notNull().default(false),
    totalAmountCents: integer("total_amount_cents").notNull().default(0),
    firstName: varchar("first_name", { length: 120 }).notNull().default(""),
    lastName: varchar("last_name", { length: 120 }).notNull().default(""),
    displayName: varchar("display_name", { length: 160 }).notNull().default(""),
    hebrewName: varchar("hebrew_name", { length: 120 }).notNull().default(""),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 60 }).notNull().default(""),
    addressLine1: varchar("address_line_1", { length: 160 }).notNull().default(""),
    addressLine2: varchar("address_line_2", { length: 160 }).notNull().default(""),
    city: varchar("city", { length: 120 }).notNull().default(""),
    state: varchar("state", { length: 80 }).notNull().default(""),
    postalCode: varchar("postal_code", { length: 20 }).notNull().default(""),
    spouseFirstName: varchar("spouse_first_name", { length: 120 }).notNull().default(""),
    spouseLastName: varchar("spouse_last_name", { length: 120 }).notNull().default(""),
    spouseHebrewName: varchar("spouse_hebrew_name", { length: 120 }).notNull().default(""),
    spouseEmail: varchar("spouse_email", { length: 255 }).notNull().default(""),
    spousePhone: varchar("spouse_phone", { length: 60 }).notNull().default(""),
    householdMembersJson: json("household_members_json").$type<Array<Record<string, string>>>().notNull().default([]),
    yahrzeitsJson: json("yahrzeits_json").$type<Array<Record<string, string>>>().notNull().default([]),
    volunteerInterestsJson: json("volunteer_interests_json").$type<string[]>().notNull().default([]),
    notes: text("notes").notNull().default(""),
    reviewNotes: text("review_notes").notNull().default(""),
    sourcePath: varchar("source_path", { length: 512 }).notNull().default("/membership/apply"),
    payloadJson: json("payload_json").$type<Record<string, unknown>>().notNull().default({}),
    reviewedAt: timestamp("reviewed_at"),
    reviewedByUserId: integer("reviewed_by_user_id").references(() => users.id),
    approvedPersonId: integer("approved_person_id").references(() => people.id),
    invitationId: integer("invitation_id").references(() => userInvitations.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    statusCreatedAtIdx: index("membership_applications_status_created_at_idx").on(table.status, table.createdAt),
    emailCreatedAtIdx: index("membership_applications_email_created_at_idx").on(table.email, table.createdAt),
    reviewerStatusIdx: index("membership_applications_reviewer_status_idx").on(table.reviewedByUserId, table.status),
  }),
);

export const paymentCampaigns = pgTable(
  "payment_campaigns",
  {
    id: serial("id").primaryKey(),
    createdByUserId: integer("created_by_user_id")
      .notNull()
      .references(() => users.id),
    title: varchar("title", { length: 180 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull().unique(),
    description: text("description").notNull().default(""),
    designationLabel: varchar("designation_label", { length: 160 }).notNull().default("General donation"),
    targetAmountCents: integer("target_amount_cents"),
    suggestedAmountCents: integer("suggested_amount_cents"),
    status: paymentCampaignStatusEnum("status").notNull().default("draft"),
    shareablePath: varchar("shareable_path", { length: 255 }).notNull().unique(),
    launchedAt: timestamp("launched_at"),
    closedAt: timestamp("closed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    statusLaunchedIdx: index("payment_campaigns_status_launched_idx").on(table.status, table.launchedAt),
    createdByStatusIdx: index("payment_campaigns_created_by_status_idx").on(table.createdByUserId, table.status),
  }),
);

export const paymentsLedger = pgTable(
  "payments_ledger",
  {
    id: serial("id").primaryKey(),
    personId: integer("person_id").references(() => people.id),
    userId: integer("user_id").references(() => users.id),
    familyId: integer("family_id").references(() => families.id),
    duesInvoiceId: integer("dues_invoice_id").references(() => duesInvoices.id),
    membershipApplicationId: integer("membership_application_id").references(() => membershipApplications.id),
    eventRegistrationId: integer("event_registration_id").references(() => eventRegistrations.id),
    campaignId: integer("campaign_id").references(() => paymentCampaigns.id),
    source: paymentSourceEnum("source").notNull().default("manual"),
    sourceLabel: varchar("source_label", { length: 120 }).notNull().default(""),
    externalPaymentId: varchar("external_payment_id", { length: 255 }).notNull().default(""),
    externalReference: varchar("external_reference", { length: 255 }).notNull().default(""),
    status: paymentStatusEnum("status").notNull().default("pending"),
    kind: paymentKindEnum("kind").notNull().default("donation"),
    classificationStatus: paymentClassificationStatusEnum("classification_status").notNull().default("unreconciled"),
    taxDeductibility: taxDeductibilityEnum("tax_deductibility").notNull().default("deductible"),
    amountCents: integer("amount_cents").notNull(),
    deductibleAmountCents: integer("deductible_amount_cents").notNull().default(0),
    goodsServicesValueCents: integer("goods_services_value_cents").notNull().default(0),
    currency: varchar("currency", { length: 3 }).notNull().default("usd"),
    designation: varchar("designation", { length: 180 }).notNull().default("General donation"),
    payerDisplayName: varchar("payer_display_name", { length: 180 }).notNull().default(""),
    payerEmail: varchar("payer_email", { length: 255 }).notNull().default(""),
    payerPhone: varchar("payer_phone", { length: 60 }).notNull().default(""),
    thankYouTemplateVersion: varchar("thank_you_template_version", { length: 60 }).notNull().default("v1"),
    receiptNumber: varchar("receipt_number", { length: 80 }).notNull().default(""),
    receiptUrl: text("receipt_url").notNull().default(""),
    receiptGeneratedAt: timestamp("receipt_generated_at"),
    yearEndLetterUrl: text("year_end_letter_url").notNull().default(""),
    yearEndLetterGeneratedAt: timestamp("year_end_letter_generated_at"),
    notes: text("notes").notNull().default(""),
    metadataJson: json("metadata_json").$type<Record<string, unknown>>().notNull().default({}),
    paidAt: timestamp("paid_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    personPaidAtIdx: index("payments_ledger_person_paid_at_idx").on(table.personId, table.paidAt),
    familyPaidAtIdx: index("payments_ledger_family_paid_at_idx").on(table.familyId, table.paidAt),
    userPaidAtIdx: index("payments_ledger_user_paid_at_idx").on(table.userId, table.paidAt),
    campaignPaidAtIdx: index("payments_ledger_campaign_paid_at_idx").on(table.campaignId, table.paidAt),
    sourceStatusPaidAtIdx: index("payments_ledger_source_status_paid_at_idx").on(table.source, table.status, table.paidAt),
    classificationPaidAtIdx: index("payments_ledger_classification_paid_at_idx").on(
      table.classificationStatus,
      table.paidAt,
    ),
    externalSourceIdx: index("payments_ledger_external_source_idx").on(
      table.source,
      table.externalPaymentId,
    ),
  }),
);

export const taxDocuments = pgTable(
  "tax_documents",
  {
    id: serial("id").primaryKey(),
    personId: integer("person_id").references(() => people.id),
    familyId: integer("family_id").references(() => families.id),
    paymentId: integer("payment_id").references(() => paymentsLedger.id),
    documentType: taxDocumentTypeEnum("document_type").notNull(),
    taxYear: integer("tax_year"),
    title: varchar("title", { length: 180 }).notNull(),
    documentNumber: varchar("document_number", { length: 80 }).notNull().unique(),
    fileUrl: text("file_url").notNull().default(""),
    payloadJson: json("payload_json").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    personTypeYearIdx: index("tax_documents_person_type_year_idx").on(table.personId, table.documentType, table.taxYear),
    familyTypeYearIdx: index("tax_documents_family_type_year_idx").on(table.familyId, table.documentType, table.taxYear),
    paymentTypeIdx: index("tax_documents_payment_type_idx").on(table.paymentId, table.documentType),
  }),
);

export const messageCampaigns = pgTable(
  "message_campaigns",
  {
    id: serial("id").primaryKey(),
    createdByUserId: integer("created_by_user_id")
      .notNull()
      .references(() => users.id),
    source: messageCampaignSourceEnum("source").notNull().default("manual"),
    channel: messageCampaignChannelEnum("channel").notNull().default("email"),
    name: varchar("name", { length: 180 }).notNull(),
    subject: varchar("subject", { length: 255 }).notNull().default(""),
    body: text("body").notNull().default(""),
    segmentKey: varchar("segment_key", { length: 80 }).notNull().default(""),
    recipientCount: integer("recipient_count").notNull().default(0),
    successCount: integer("success_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    skippedCount: integer("skipped_count").notNull().default(0),
    status: messageCampaignStatusEnum("status").notNull().default("sending"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    creatorStartedIdx: index("message_campaigns_creator_started_idx").on(table.createdByUserId, table.startedAt),
    sourceChannelStartedIdx: index("message_campaigns_source_channel_started_idx").on(table.source, table.channel, table.startedAt),
  }),
);

export const messageDeliveries = pgTable(
  "message_deliveries",
  {
    id: serial("id").primaryKey(),
    campaignId: integer("campaign_id")
      .notNull()
      .references(() => messageCampaigns.id),
    personId: integer("person_id").references(() => people.id),
    userId: integer("user_id").references(() => users.id),
    recipientEmail: varchar("recipient_email", { length: 255 }).notNull().default(""),
    recipientPhone: varchar("recipient_phone", { length: 60 }).notNull().default(""),
    recipientName: varchar("recipient_name", { length: 160 }).notNull().default(""),
    channel: messageCampaignChannelEnum("channel").notNull().default("email"),
    provider: varchar("provider", { length: 60 }).notNull().default("sendgrid"),
    providerMessageId: varchar("provider_message_id", { length: 255 }).notNull().default(""),
    status: messageDeliveryStatusEnum("status").notNull().default("queued"),
    errorMessage: text("error_message").notNull().default(""),
    payloadJson: json("payload_json").$type<Record<string, unknown>>().notNull().default({}),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    campaignStatusIdx: index("message_deliveries_campaign_status_idx").on(table.campaignId, table.status),
    personCreatedAtIdx: index("message_deliveries_person_created_at_idx").on(table.personId, table.createdAt),
    recipientEmailIdx: index("message_deliveries_recipient_email_idx").on(table.recipientEmail),
  }),
);

export const messageSuppressions = pgTable(
  "message_suppressions",
  {
    id: serial("id").primaryKey(),
    personId: integer("person_id").references(() => people.id),
    channel: messageCampaignChannelEnum("channel").notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 60 }),
    reason: varchar("reason", { length: 255 }).notNull().default(""),
    createdByUserId: integer("created_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    channelEmailUniqueIdx: uniqueIndex("message_suppressions_channel_email_unique_idx").on(table.channel, table.email),
    channelPhoneUniqueIdx: uniqueIndex("message_suppressions_channel_phone_unique_idx").on(table.channel, table.phone),
    personChannelIdx: index("message_suppressions_person_channel_idx").on(table.personId, table.channel),
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
