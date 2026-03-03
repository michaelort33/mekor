CREATE TYPE "public"."profile_visibility" AS ENUM('private', 'members_only', 'public', 'anonymous');--> statement-breakpoint
CREATE TYPE "public"."template_status" AS ENUM('draft', 'ready', 'sent', 'archived');--> statement-breakpoint
CREATE TABLE "member_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(140) NOT NULL,
	"full_name" varchar(120) NOT NULL,
	"avatar_url" text DEFAULT '' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"interests" json DEFAULT '[]'::json NOT NULL,
	"city" varchar(120) DEFAULT '' NOT NULL,
	"email" varchar(255) DEFAULT '' NOT NULL,
	"phone" varchar(60) DEFAULT '' NOT NULL,
	"visibility" "profile_visibility" DEFAULT 'private' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "member_profiles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "newsletter_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"subject" varchar(255) DEFAULT '' NOT NULL,
	"parsha_name" varchar(120) DEFAULT '' NOT NULL,
	"shabbat_date" varchar(120) DEFAULT '' NOT NULL,
	"hebrew_date" varchar(120) DEFAULT '' NOT NULL,
	"candle_lighting" varchar(60) DEFAULT '' NOT NULL,
	"body_html" text DEFAULT '' NOT NULL,
	"status" "template_status" DEFAULT 'draft' NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
