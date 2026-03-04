ALTER TYPE "public"."user_role" ADD VALUE 'super_admin';--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(120) NOT NULL,
	"value" text NOT NULL,
	"label" varchar(255) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"setting_type" varchar(40) DEFAULT 'boolean' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
