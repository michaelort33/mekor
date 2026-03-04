CREATE TYPE "public"."automated_message_delivery_status" AS ENUM('sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."automated_message_type" AS ENUM('membership_renewal_reminder');--> statement-breakpoint
CREATE TABLE "automated_message_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"message_type" "automated_message_type" NOT NULL,
	"membership_renewal_date" date NOT NULL,
	"recipient_email" varchar(255) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"provider" varchar(40) DEFAULT 'sendgrid' NOT NULL,
	"provider_message_id" varchar(255) DEFAULT '' NOT NULL,
	"delivery_status" "automated_message_delivery_status" NOT NULL,
	"error_message" text DEFAULT '' NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "membership_start_date" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "membership_renewal_date" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auto_messages_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "automated_message_log" ADD CONSTRAINT "automated_message_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "automated_message_log_user_type_renewal_unique_idx" ON "automated_message_log" USING btree ("user_id","message_type","membership_renewal_date");--> statement-breakpoint
CREATE INDEX "automated_message_log_created_at_id_idx" ON "automated_message_log" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "users_renewal_auto_messages_idx" ON "users" USING btree ("membership_renewal_date","auto_messages_enabled");