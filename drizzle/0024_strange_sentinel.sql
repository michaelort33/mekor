CREATE TYPE "public"."newsletter_subscription_status" AS ENUM('pending', 'subscribed', 'unsubscribed', 'bounced', 'complained');--> statement-breakpoint
ALTER TYPE "public"."message_campaign_status" ADD VALUE 'draft' BEFORE 'sending';--> statement-breakpoint
ALTER TYPE "public"."message_campaign_status" ADD VALUE 'ready' BEFORE 'sending';--> statement-breakpoint
ALTER TYPE "public"."message_campaign_status" ADD VALUE 'scheduled' BEFORE 'sending';--> statement-breakpoint
ALTER TYPE "public"."message_campaign_status" ADD VALUE 'cancelled';--> statement-breakpoint
CREATE TABLE "newsletter_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"topic" varchar(80) DEFAULT 'weekly' NOT NULL,
	"status" "newsletter_subscription_status" DEFAULT 'pending' NOT NULL,
	"source" varchar(120) DEFAULT 'website' NOT NULL,
	"confirmation_token_hash" varchar(64),
	"confirmation_expires_at" timestamp,
	"unsubscribe_token" varchar(64) NOT NULL,
	"confirmed_at" timestamp,
	"unsubscribed_at" timestamp,
	"last_provider_event_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscriptions_confirmation_token_hash_unique" UNIQUE("confirmation_token_hash"),
	CONSTRAINT "newsletter_subscriptions_unsubscribe_token_unique" UNIQUE("unsubscribe_token")
);--> statement-breakpoint
CREATE TABLE "newsletter_issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer,
	"campaign_id" integer,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"subject" varchar(255) DEFAULT '' NOT NULL,
	"category" varchar(60) DEFAULT 'weekly' NOT NULL,
	"preview_text" text DEFAULT '' NOT NULL,
	"cover_image" text DEFAULT '' NOT NULL,
	"reading_minutes" integer DEFAULT 1 NOT NULL,
	"search_text" text DEFAULT '' NOT NULL,
	"content_json" json DEFAULT '{}'::json NOT NULL,
	"body_html" text DEFAULT '' NOT NULL,
	"source" varchar(60) DEFAULT 'native' NOT NULL,
	"external_campaign_id" varchar(255) DEFAULT '' NOT NULL,
	"published_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_issues_slug_unique" UNIQUE("slug")
);--> statement-breakpoint
CREATE TABLE "newsletter_delivery_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"delivery_id" integer,
	"provider_message_id" varchar(255) DEFAULT '' NOT NULL,
	"recipient_email" varchar(255) DEFAULT '' NOT NULL,
	"event_type" varchar(80) NOT NULL,
	"event_key" varchar(255) NOT NULL,
	"payload_json" json DEFAULT '{}'::json NOT NULL,
	"occurred_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_delivery_events_event_key_unique" UNIQUE("event_key")
);--> statement-breakpoint
ALTER TABLE "message_campaigns" ADD COLUMN "template_id" integer;--> statement-breakpoint
ALTER TABLE "message_campaigns" ADD COLUMN "sender_email" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "message_campaigns" ADD COLUMN "timezone" varchar(80) DEFAULT 'America/New_York' NOT NULL;--> statement-breakpoint
ALTER TABLE "message_campaigns" ADD COLUMN "scheduled_at" timestamp;--> statement-breakpoint
ALTER TABLE "message_campaigns" ADD COLUMN "cancelled_at" timestamp;--> statement-breakpoint
ALTER TABLE "message_campaigns" ADD COLUMN "publish_on_complete" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "newsletter_templates" ADD COLUMN "slug" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "newsletter_templates" ADD COLUMN "category" varchar(60) DEFAULT 'weekly' NOT NULL;--> statement-breakpoint
ALTER TABLE "newsletter_templates" ADD COLUMN "preview_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "newsletter_templates" ADD COLUMN "publish_on_send" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "newsletter_subscriptions" ADD CONSTRAINT "newsletter_subscriptions_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_issues" ADD CONSTRAINT "newsletter_issues_template_id_newsletter_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."newsletter_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_issues" ADD CONSTRAINT "newsletter_issues_campaign_id_message_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."message_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_delivery_events" ADD CONSTRAINT "newsletter_delivery_events_delivery_id_message_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."message_deliveries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_campaigns" ADD CONSTRAINT "message_campaigns_template_id_newsletter_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."newsletter_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_subscriptions_person_topic_unique_idx" ON "newsletter_subscriptions" USING btree ("person_id","topic");--> statement-breakpoint
CREATE INDEX "newsletter_subscriptions_topic_status_idx" ON "newsletter_subscriptions" USING btree ("topic","status");--> statement-breakpoint
CREATE INDEX "newsletter_subscriptions_status_updated_idx" ON "newsletter_subscriptions" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "newsletter_issues_published_at_idx" ON "newsletter_issues" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "newsletter_issues_category_published_idx" ON "newsletter_issues" USING btree ("category","published_at");--> statement-breakpoint
CREATE INDEX "newsletter_delivery_events_provider_message_idx" ON "newsletter_delivery_events" USING btree ("provider_message_id");--> statement-breakpoint
CREATE INDEX "newsletter_delivery_events_recipient_occurred_idx" ON "newsletter_delivery_events" USING btree ("recipient_email","occurred_at");--> statement-breakpoint
CREATE INDEX "message_campaigns_status_scheduled_idx" ON "message_campaigns" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "message_campaigns_template_created_idx" ON "message_campaigns" USING btree ("template_id","created_at");
