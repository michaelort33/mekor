import {
  boolean,
  integer,
  json,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

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
