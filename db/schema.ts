import {
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
