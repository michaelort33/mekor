CREATE TYPE "public"."admin_inbox_event_source_type" AS ENUM('form_submission', 'mailchimp_signup');--> statement-breakpoint
CREATE TYPE "public"."admin_inbox_event_status" AS ENUM('new', 'read', 'archived');--> statement-breakpoint
CREATE TYPE "public"."admin_notification_category" AS ENUM('general_forms', 'volunteer', 'kosher', 'davening', 'kiddush', 'auxiliary_membership', 'newsletter_signup');--> statement-breakpoint
CREATE TYPE "public"."mailchimp_signup_event_type" AS ENUM('subscribe', 'profile', 'upemail', 'cleaned', 'unsubscribe');--> statement-breakpoint
CREATE TABLE "admin_inbox_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_type" "admin_inbox_event_source_type" NOT NULL,
	"category" "admin_notification_category" NOT NULL,
	"source_id" varchar(80) NOT NULL,
	"title" varchar(255) NOT NULL,
	"submitter_name" varchar(120) DEFAULT '' NOT NULL,
	"submitter_email" varchar(255) DEFAULT '' NOT NULL,
	"submitter_phone" varchar(60) DEFAULT '' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"payload_json" json DEFAULT '{}'::json NOT NULL,
	"status" "admin_inbox_event_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"category" "admin_notification_category" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mailchimp_signup_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_key" varchar(255) NOT NULL,
	"list_id" varchar(120) DEFAULT '' NOT NULL,
	"event_type" "mailchimp_signup_event_type" NOT NULL,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(120) DEFAULT '' NOT NULL,
	"last_name" varchar(120) DEFAULT '' NOT NULL,
	"payload_json" json DEFAULT '{}'::json NOT NULL,
	"occurred_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mailchimp_signup_events_event_key_unique" UNIQUE("event_key")
);
--> statement-breakpoint
ALTER TABLE "admin_notification_preferences" ADD CONSTRAINT "admin_notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_inbox_events_category_status_created_idx" ON "admin_inbox_events" USING btree ("category","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_inbox_events_source_type_source_id_unique_idx" ON "admin_inbox_events" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "admin_inbox_events_status_created_idx" ON "admin_inbox_events" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_notification_preferences_user_category_unique_idx" ON "admin_notification_preferences" USING btree ("user_id","category");--> statement-breakpoint
CREATE INDEX "admin_notification_preferences_category_enabled_idx" ON "admin_notification_preferences" USING btree ("category","enabled");--> statement-breakpoint
CREATE INDEX "mailchimp_signup_events_list_event_occurred_idx" ON "mailchimp_signup_events" USING btree ("list_id","event_type","occurred_at");--> statement-breakpoint
CREATE INDEX "mailchimp_signup_events_email_occurred_idx" ON "mailchimp_signup_events" USING btree ("email","occurred_at");