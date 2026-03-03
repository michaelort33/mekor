CREATE TYPE "public"."template_status" AS ENUM('draft', 'ready', 'sent', 'archived');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('visitor', 'member', 'admin');--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"city" varchar(120) DEFAULT '' NOT NULL,
	"avatar_url" text DEFAULT '' NOT NULL,
	"show_in_members_area" boolean DEFAULT false NOT NULL,
	"role" "user_role" DEFAULT 'visitor' NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "users_directory_role_visibility_display_name_idx" ON "users" USING btree ("role","show_in_members_area","display_name");