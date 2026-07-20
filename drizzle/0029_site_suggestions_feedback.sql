CREATE TYPE "public"."site_suggestion_kind" AS ENUM('suggestion', 'feedback', 'bug', 'praise', 'other');--> statement-breakpoint
CREATE TYPE "public"."site_suggestion_status" AS ENUM('new', 'reviewed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."site_suggestion_priority" AS ENUM('low', 'normal', 'high');--> statement-breakpoint
CREATE TABLE "site_feedback_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" varchar(40) NOT NULL,
	"source_path" varchar(512) DEFAULT '' NOT NULL,
	"user_id" integer,
	"user_agent" varchar(512) DEFAULT '' NOT NULL,
	"transcript_json" json DEFAULT '[]'::json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"kind" "site_suggestion_kind" NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text NOT NULL,
	"category_detail" varchar(120) DEFAULT '' NOT NULL,
	"contact_name" varchar(120) DEFAULT '' NOT NULL,
	"contact_email" varchar(255) DEFAULT '' NOT NULL,
	"priority" "site_suggestion_priority" DEFAULT 'normal' NOT NULL,
	"status" "site_suggestion_status" DEFAULT 'new' NOT NULL,
	"admin_notes" text DEFAULT '' NOT NULL,
	"source_path" varchar(512) DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_feedback_sessions" ADD CONSTRAINT "site_feedback_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_suggestions" ADD CONSTRAINT "site_suggestions_session_id_site_feedback_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."site_feedback_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "site_feedback_sessions_public_id_unique_idx" ON "site_feedback_sessions" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "site_feedback_sessions_created_at_idx" ON "site_feedback_sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "site_feedback_sessions_user_id_idx" ON "site_feedback_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "site_suggestions_status_created_idx" ON "site_suggestions" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "site_suggestions_kind_created_idx" ON "site_suggestions" USING btree ("kind","created_at");--> statement-breakpoint
CREATE INDEX "site_suggestions_session_id_idx" ON "site_suggestions" USING btree ("session_id");
