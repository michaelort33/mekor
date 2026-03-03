CREATE TYPE "public"."dues_frequency" AS ENUM('annual', 'monthly', 'custom');--> statement-breakpoint
CREATE TYPE "public"."dues_invoice_status" AS ENUM('open', 'paid', 'void', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."dues_reminder_type" AS ENUM('d30', 'd7', 'd1', 'overdue_weekly');--> statement-breakpoint
CREATE TYPE "public"."event_registration_status" AS ENUM('registered', 'waitlisted', 'cancelled', 'payment_pending');--> statement-breakpoint
CREATE TYPE "public"."event_reminder_type" AS ENUM('event_24h');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'succeeded', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."profile_visibility" AS ENUM('private', 'members', 'public', 'anonymous');--> statement-breakpoint
CREATE TABLE "dues_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"schedule_id" integer,
	"label" varchar(160) NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'usd' NOT NULL,
	"due_date" date NOT NULL,
	"status" "dues_invoice_status" DEFAULT 'open' NOT NULL,
	"paid_at" timestamp,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"stripe_receipt_url" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dues_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"invoice_id" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'usd' NOT NULL,
	"status" "payment_status" NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"stripe_receipt_url" text DEFAULT '' NOT NULL,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dues_reminder_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"reminder_type" "dues_reminder_type" NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dues_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"frequency" "dues_frequency" NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'usd' NOT NULL,
	"next_due_date" date NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_organizer_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"subject" varchar(160) NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"ticket_tier_id" integer,
	"status" "event_registration_status" NOT NULL,
	"payment_due_at" timestamp,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"receipt_url" text DEFAULT '' NOT NULL,
	"registered_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_reminder_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"registration_id" integer NOT NULL,
	"reminder_type" "event_reminder_type" NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_signup_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"capacity" integer,
	"waitlist_enabled" boolean DEFAULT true NOT NULL,
	"payment_required" boolean DEFAULT false NOT NULL,
	"registration_deadline" timestamp,
	"organizer_email" varchar(255) DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_signup_settings_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "event_ticket_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_signup_settings_id" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'usd' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_customers_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "stripe_customers_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
DROP INDEX "users_directory_role_visibility_display_name_idx";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_visibility" "profile_visibility" DEFAULT 'private' NOT NULL;--> statement-breakpoint
UPDATE "users"
SET "profile_visibility" = CASE
  WHEN "show_in_members_area" = true THEN 'members'::"profile_visibility"
  ELSE 'private'::"profile_visibility"
END;--> statement-breakpoint
ALTER TABLE "dues_invoices" ADD CONSTRAINT "dues_invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dues_invoices" ADD CONSTRAINT "dues_invoices_schedule_id_dues_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."dues_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dues_payments" ADD CONSTRAINT "dues_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dues_payments" ADD CONSTRAINT "dues_payments_invoice_id_dues_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."dues_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dues_reminder_log" ADD CONSTRAINT "dues_reminder_log_invoice_id_dues_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."dues_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dues_schedules" ADD CONSTRAINT "dues_schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_organizer_messages" ADD CONSTRAINT "event_organizer_messages_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_organizer_messages" ADD CONSTRAINT "event_organizer_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_ticket_tier_id_event_ticket_tiers_id_fk" FOREIGN KEY ("ticket_tier_id") REFERENCES "public"."event_ticket_tiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_reminder_log" ADD CONSTRAINT "event_reminder_log_registration_id_event_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."event_registrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_signup_settings" ADD CONSTRAINT "event_signup_settings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_ticket_tiers" ADD CONSTRAINT "event_ticket_tiers_event_signup_settings_id_event_signup_settings_id_fk" FOREIGN KEY ("event_signup_settings_id") REFERENCES "public"."event_signup_settings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_customers" ADD CONSTRAINT "stripe_customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dues_invoices_user_status_due_date_idx" ON "dues_invoices" USING btree ("user_id","status","due_date");--> statement-breakpoint
CREATE INDEX "dues_payments_invoice_status_idx" ON "dues_payments" USING btree ("invoice_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "dues_reminder_log_invoice_reminder_type_idx" ON "dues_reminder_log" USING btree ("invoice_id","reminder_type");--> statement-breakpoint
CREATE INDEX "dues_schedules_user_due_date_idx" ON "dues_schedules" USING btree ("user_id","next_due_date");--> statement-breakpoint
CREATE UNIQUE INDEX "event_registrations_event_user_unique_idx" ON "event_registrations" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "event_registrations_event_status_registered_at_idx" ON "event_registrations" USING btree ("event_id","status","registered_at");--> statement-breakpoint
CREATE UNIQUE INDEX "event_reminder_log_registration_reminder_type_idx" ON "event_reminder_log" USING btree ("registration_id","reminder_type");--> statement-breakpoint
CREATE INDEX "event_signup_settings_enabled_deadline_idx" ON "event_signup_settings" USING btree ("enabled","registration_deadline");--> statement-breakpoint
CREATE INDEX "event_ticket_tiers_settings_sort_idx" ON "event_ticket_tiers" USING btree ("event_signup_settings_id","sort_order");--> statement-breakpoint
CREATE INDEX "users_directory_role_visibility_display_name_idx" ON "users" USING btree ("role","profile_visibility","display_name");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "show_in_members_area";
