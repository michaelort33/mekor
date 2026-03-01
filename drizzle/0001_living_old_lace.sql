CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"path" varchar(512) NOT NULL,
	"title" varchar(255) NOT NULL,
	"short_date" varchar(120) DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"time_label" varchar(255) DEFAULT '' NOT NULL,
	"start_at" timestamp,
	"end_at" timestamp,
	"is_closed" boolean DEFAULT false NOT NULL,
	"source_captured_at" timestamp,
	"source_type" varchar(40) DEFAULT 'mirror' NOT NULL,
	"source_json" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug"),
	CONSTRAINT "events_path_unique" UNIQUE("path")
);
