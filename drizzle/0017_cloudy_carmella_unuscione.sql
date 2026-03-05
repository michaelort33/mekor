CREATE TYPE "public"."communication_preferred_channel" AS ENUM('email', 'sms', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."contact_method_type" AS ENUM('email', 'phone', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."membership_pipeline_event_type" AS ENUM('lead_created', 'tour_attended', 'invited', 'joined', 'renewed', 'churned', 'status_changed', 'note');--> statement-breakpoint
CREATE TYPE "public"."message_campaign_channel" AS ENUM('email', 'sms', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."message_campaign_source" AS ENUM('manual', 'newsletter', 'automated');--> statement-breakpoint
CREATE TYPE "public"."message_campaign_status" AS ENUM('sending', 'completed', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."message_delivery_status" AS ENUM('queued', 'sent', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."people_status" AS ENUM('lead', 'invited', 'visitor', 'member', 'admin', 'super_admin', 'inactive');--> statement-breakpoint
CREATE TABLE "communication_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"email_opt_in" boolean DEFAULT true NOT NULL,
	"sms_opt_in" boolean DEFAULT false NOT NULL,
	"whatsapp_opt_in" boolean DEFAULT false NOT NULL,
	"do_not_contact" boolean DEFAULT false NOT NULL,
	"quiet_hours_start" varchar(5) DEFAULT '' NOT NULL,
	"quiet_hours_end" varchar(5) DEFAULT '' NOT NULL,
	"preferred_channel" "communication_preferred_channel" DEFAULT 'email' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "communication_preferences_person_id_unique" UNIQUE("person_id")
);
--> statement-breakpoint
CREATE TABLE "contact_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"type" "contact_method_type" NOT NULL,
	"value" varchar(255) NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_pipeline_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"actor_user_id" integer,
	"event_type" "membership_pipeline_event_type" NOT NULL,
	"summary" varchar(255) DEFAULT '' NOT NULL,
	"payload_json" json DEFAULT '{}'::json NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_by_user_id" integer NOT NULL,
	"source" "message_campaign_source" DEFAULT 'manual' NOT NULL,
	"channel" "message_campaign_channel" DEFAULT 'email' NOT NULL,
	"name" varchar(180) NOT NULL,
	"subject" varchar(255) DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"segment_key" varchar(80) DEFAULT '' NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"status" "message_campaign_status" DEFAULT 'sending' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"person_id" integer,
	"user_id" integer,
	"recipient_email" varchar(255) DEFAULT '' NOT NULL,
	"recipient_phone" varchar(60) DEFAULT '' NOT NULL,
	"recipient_name" varchar(160) DEFAULT '' NOT NULL,
	"channel" "message_campaign_channel" DEFAULT 'email' NOT NULL,
	"provider" varchar(60) DEFAULT 'sendgrid' NOT NULL,
	"provider_message_id" varchar(255) DEFAULT '' NOT NULL,
	"status" "message_delivery_status" DEFAULT 'queued' NOT NULL,
	"error_message" text DEFAULT '' NOT NULL,
	"payload_json" json DEFAULT '{}'::json NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_suppressions" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer,
	"channel" "message_campaign_channel" NOT NULL,
	"email" varchar(255) DEFAULT '' NOT NULL,
	"phone" varchar(60) DEFAULT '' NOT NULL,
	"reason" varchar(255) DEFAULT '' NOT NULL,
	"created_by_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"status" "people_status" DEFAULT 'lead' NOT NULL,
	"first_name" varchar(120) DEFAULT '' NOT NULL,
	"last_name" varchar(120) DEFAULT '' NOT NULL,
	"display_name" varchar(160) DEFAULT '' NOT NULL,
	"email" varchar(255) DEFAULT '' NOT NULL,
	"phone" varchar(60) DEFAULT '' NOT NULL,
	"city" varchar(120) DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"source" varchar(120) DEFAULT '' NOT NULL,
	"tags" json DEFAULT '[]'::json NOT NULL,
	"invited_at" timestamp,
	"joined_at" timestamp,
	"last_contacted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "people_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "user_invitations" ADD COLUMN "person_id" integer;--> statement-breakpoint
INSERT INTO "people" (
	"user_id",
	"status",
	"first_name",
	"last_name",
	"display_name",
	"email",
	"phone",
	"city",
	"notes",
	"source",
	"tags",
	"invited_at",
	"joined_at",
	"last_contacted_at",
	"created_at",
	"updated_at"
)
SELECT
	u.id,
	CASE
		WHEN u.role = 'visitor' THEN 'visitor'::people_status
		WHEN u.role = 'member' THEN 'member'::people_status
		WHEN u.role = 'admin' THEN 'admin'::people_status
		WHEN u.role = 'super_admin' THEN 'super_admin'::people_status
		ELSE 'lead'::people_status
	END,
	split_part(u.display_name, ' ', 1),
	trim(substr(u.display_name, length(split_part(u.display_name, ' ', 1)) + 1)),
	u.display_name,
	u.email,
	'',
	u.city,
	'',
	'migration_users_backfill',
	'[]'::json,
	null,
	u.created_at,
	null,
	u.created_at,
	now()
FROM "users" u
ON CONFLICT ("email")
DO UPDATE SET
	"user_id" = EXCLUDED."user_id",
	"status" = EXCLUDED."status",
	"display_name" = EXCLUDED."display_name",
	"city" = EXCLUDED."city",
	"updated_at" = now();--> statement-breakpoint
INSERT INTO "communication_preferences" (
	"person_id",
	"email_opt_in",
	"sms_opt_in",
	"whatsapp_opt_in",
	"do_not_contact",
	"quiet_hours_start",
	"quiet_hours_end",
	"preferred_channel",
	"created_at",
	"updated_at"
)
SELECT
	p.id,
	true,
	false,
	false,
	false,
	'',
	'',
	'email',
	now(),
	now()
FROM "people" p
ON CONFLICT ("person_id") DO NOTHING;--> statement-breakpoint
INSERT INTO "contact_methods" (
	"person_id",
	"type",
	"value",
	"is_primary",
	"verified_at",
	"created_at",
	"updated_at"
)
SELECT
	p.id,
	'email',
	p.email,
	true,
	null,
	now(),
	now()
FROM "people" p
WHERE p.email <> ''
ON CONFLICT ("person_id","type","value")
DO UPDATE SET
	"is_primary" = true,
	"updated_at" = now();--> statement-breakpoint
UPDATE "user_invitations" ui
SET "person_id" = p.id
FROM "people" p
WHERE ui."person_id" IS NULL
	AND ui."email" = p."email";--> statement-breakpoint
ALTER TABLE "communication_preferences" ADD CONSTRAINT "communication_preferences_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_methods" ADD CONSTRAINT "contact_methods_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_pipeline_events" ADD CONSTRAINT "membership_pipeline_events_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_pipeline_events" ADD CONSTRAINT "membership_pipeline_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_campaigns" ADD CONSTRAINT "message_campaigns_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_deliveries" ADD CONSTRAINT "message_deliveries_campaign_id_message_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."message_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_deliveries" ADD CONSTRAINT "message_deliveries_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_deliveries" ADD CONSTRAINT "message_deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_suppressions" ADD CONSTRAINT "message_suppressions_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_suppressions" ADD CONSTRAINT "message_suppressions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "communication_preferences_contact_flags_idx" ON "communication_preferences" USING btree ("do_not_contact","email_opt_in","sms_opt_in","whatsapp_opt_in");--> statement-breakpoint
CREATE INDEX "contact_methods_person_type_primary_idx" ON "contact_methods" USING btree ("person_id","type","is_primary");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_methods_person_type_value_unique_idx" ON "contact_methods" USING btree ("person_id","type","value");--> statement-breakpoint
CREATE INDEX "membership_pipeline_events_person_occurred_at_idx" ON "membership_pipeline_events" USING btree ("person_id","occurred_at");--> statement-breakpoint
CREATE INDEX "membership_pipeline_events_type_occurred_at_idx" ON "membership_pipeline_events" USING btree ("event_type","occurred_at");--> statement-breakpoint
CREATE INDEX "message_campaigns_creator_started_idx" ON "message_campaigns" USING btree ("created_by_user_id","started_at");--> statement-breakpoint
CREATE INDEX "message_campaigns_source_channel_started_idx" ON "message_campaigns" USING btree ("source","channel","started_at");--> statement-breakpoint
CREATE INDEX "message_deliveries_campaign_status_idx" ON "message_deliveries" USING btree ("campaign_id","status");--> statement-breakpoint
CREATE INDEX "message_deliveries_person_created_at_idx" ON "message_deliveries" USING btree ("person_id","created_at");--> statement-breakpoint
CREATE INDEX "message_deliveries_recipient_email_idx" ON "message_deliveries" USING btree ("recipient_email");--> statement-breakpoint
CREATE UNIQUE INDEX "message_suppressions_channel_email_unique_idx" ON "message_suppressions" USING btree ("channel","email");--> statement-breakpoint
CREATE UNIQUE INDEX "message_suppressions_channel_phone_unique_idx" ON "message_suppressions" USING btree ("channel","phone");--> statement-breakpoint
CREATE INDEX "message_suppressions_person_channel_idx" ON "message_suppressions" USING btree ("person_id","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "people_email_unique_idx" ON "people" USING btree ("email");--> statement-breakpoint
CREATE INDEX "people_status_created_at_idx" ON "people" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "people_user_status_idx" ON "people" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "people_created_at_id_idx" ON "people" USING btree ("created_at","id");--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_invitations_person_email_state_idx" ON "user_invitations" USING btree ("person_id","email","accepted_at");
