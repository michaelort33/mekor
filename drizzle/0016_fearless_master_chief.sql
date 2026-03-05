CREATE TYPE "public"."member_event_attendee_status" AS ENUM('requested', 'approved', 'rejected', 'cancelled', 'waitlisted');--> statement-breakpoint
CREATE TYPE "public"."member_event_join_mode" AS ENUM('open_join', 'request_to_join');--> statement-breakpoint
CREATE TYPE "public"."member_event_status" AS ENUM('draft', 'published', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."member_event_visibility" AS ENUM('members_only', 'public');--> statement-breakpoint
CREATE TABLE "member_event_activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"actor_user_id" integer,
	"attendee_id" integer,
	"action" varchar(120) NOT NULL,
	"payload_json" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_event_attendees" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"status" "member_event_attendee_status" NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_event_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"host_user_id" integer NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp,
	"location" varchar(255) DEFAULT '' NOT NULL,
	"capacity" integer,
	"join_mode" "member_event_join_mode" DEFAULT 'open_join' NOT NULL,
	"visibility" "member_event_visibility" DEFAULT 'members_only' NOT NULL,
	"status" "member_event_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "member_event_activity_log" ADD CONSTRAINT "member_event_activity_log_event_id_member_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."member_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_event_activity_log" ADD CONSTRAINT "member_event_activity_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_event_activity_log" ADD CONSTRAINT "member_event_activity_log_attendee_id_member_event_attendees_id_fk" FOREIGN KEY ("attendee_id") REFERENCES "public"."member_event_attendees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_event_attendees" ADD CONSTRAINT "member_event_attendees_event_id_member_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."member_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_event_attendees" ADD CONSTRAINT "member_event_attendees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_event_comments" ADD CONSTRAINT "member_event_comments_event_id_member_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."member_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_event_comments" ADD CONSTRAINT "member_event_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_events" ADD CONSTRAINT "member_events_host_user_id_users_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_event_activity_log_event_action_idx" ON "member_event_activity_log" USING btree ("event_id","action");--> statement-breakpoint
CREATE INDEX "member_event_activity_log_event_created_at_idx" ON "member_event_activity_log" USING btree ("event_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "member_event_attendees_event_user_unique_idx" ON "member_event_attendees" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "member_event_attendees_event_status_requested_idx" ON "member_event_attendees" USING btree ("event_id","status","requested_at");--> statement-breakpoint
CREATE INDEX "member_event_attendees_user_status_requested_idx" ON "member_event_attendees" USING btree ("user_id","status","requested_at");--> statement-breakpoint
CREATE INDEX "member_event_comments_event_created_at_idx" ON "member_event_comments" USING btree ("event_id","created_at");--> statement-breakpoint
CREATE INDEX "member_events_starts_at_idx" ON "member_events" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "member_events_host_status_idx" ON "member_events" USING btree ("host_user_id","status");--> statement-breakpoint
CREATE INDEX "member_events_status_visibility_starts_at_idx" ON "member_events" USING btree ("status","visibility","starts_at");