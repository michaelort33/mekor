CREATE TYPE "public"."newsletter_campaign_status" AS ENUM('sending', 'completed', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."newsletter_delivery_status" AS ENUM('sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."newsletter_recipient_group" AS ENUM('all_members', 'admins_only', 'dues_outstanding', 'directory_visible');--> statement-breakpoint
CREATE TABLE "newsletter_campaign_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"template_id" integer NOT NULL,
	"recipient_user_id" integer,
	"recipient_email" varchar(255) NOT NULL,
	"recipient_name" varchar(120) DEFAULT '' NOT NULL,
	"status" "newsletter_delivery_status" NOT NULL,
	"provider" varchar(40) DEFAULT 'sendgrid' NOT NULL,
	"provider_message_id" varchar(255) DEFAULT '' NOT NULL,
	"error_message" text DEFAULT '' NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"sent_by_user_id" integer NOT NULL,
	"recipient_group" "newsletter_recipient_group" NOT NULL,
	"subject" varchar(255) NOT NULL,
	"sender_email" varchar(255) NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"status" "newsletter_campaign_status" DEFAULT 'sending' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "newsletter_campaign_deliveries" ADD CONSTRAINT "newsletter_campaign_deliveries_campaign_id_newsletter_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."newsletter_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_campaign_deliveries" ADD CONSTRAINT "newsletter_campaign_deliveries_template_id_newsletter_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."newsletter_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_campaign_deliveries" ADD CONSTRAINT "newsletter_campaign_deliveries_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_campaigns" ADD CONSTRAINT "newsletter_campaigns_template_id_newsletter_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."newsletter_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_campaigns" ADD CONSTRAINT "newsletter_campaigns_sent_by_user_id_users_id_fk" FOREIGN KEY ("sent_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "newsletter_campaign_deliveries_campaign_status_idx" ON "newsletter_campaign_deliveries" USING btree ("campaign_id","status");--> statement-breakpoint
CREATE INDEX "newsletter_campaign_deliveries_template_created_idx" ON "newsletter_campaign_deliveries" USING btree ("template_id","created_at");--> statement-breakpoint
CREATE INDEX "newsletter_campaign_deliveries_recipient_email_idx" ON "newsletter_campaign_deliveries" USING btree ("recipient_email");--> statement-breakpoint
CREATE INDEX "newsletter_campaigns_template_started_idx" ON "newsletter_campaigns" USING btree ("template_id","started_at");--> statement-breakpoint
CREATE INDEX "newsletter_campaigns_sender_started_idx" ON "newsletter_campaigns" USING btree ("sent_by_user_id","started_at");