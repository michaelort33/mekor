CREATE TABLE "form_delivery_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"provider" varchar(60) DEFAULT 'resend' NOT NULL,
	"status" varchar(40) NOT NULL,
	"error_message" varchar(512) DEFAULT '' NOT NULL,
	"delivered_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_type" varchar(80) NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(60) DEFAULT '' NOT NULL,
	"message" text NOT NULL,
	"source_path" varchar(512) DEFAULT '' NOT NULL,
	"payload_json" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
