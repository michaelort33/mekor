CREATE TABLE "mailchimp_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"last_import_run_id" integer NOT NULL,
	"audience_key" varchar(120) NOT NULL,
	"audience_label" varchar(160) NOT NULL,
	"export_status" varchar(30) NOT NULL,
	"email" varchar(255) NOT NULL,
	"euid" varchar(120) DEFAULT '' NOT NULL,
	"leid" varchar(120) DEFAULT '' NOT NULL,
	"first_name" varchar(160) DEFAULT '' NOT NULL,
	"last_name" varchar(160) DEFAULT '' NOT NULL,
	"address_raw" text DEFAULT '' NOT NULL,
	"address_line_1" varchar(255) DEFAULT '' NOT NULL,
	"address_line_2" varchar(255) DEFAULT '' NOT NULL,
	"city" varchar(160) DEFAULT '' NOT NULL,
	"state" varchar(120) DEFAULT '' NOT NULL,
	"postal_code" varchar(60) DEFAULT '' NOT NULL,
	"country" varchar(120) DEFAULT '' NOT NULL,
	"phone_raw" varchar(120) DEFAULT '' NOT NULL,
	"birthdate" varchar(80) DEFAULT '' NOT NULL,
	"email_type" varchar(30) DEFAULT '' NOT NULL,
	"member_rating" integer,
	"optin_time" timestamp,
	"optin_ip" varchar(80) DEFAULT '' NOT NULL,
	"confirm_time" timestamp,
	"confirm_ip" varchar(80) DEFAULT '' NOT NULL,
	"gmt_offset" varchar(30) DEFAULT '' NOT NULL,
	"dst_offset" varchar(30) DEFAULT '' NOT NULL,
	"timezone" varchar(120) DEFAULT '' NOT NULL,
	"country_code" varchar(20) DEFAULT '' NOT NULL,
	"region" varchar(120) DEFAULT '' NOT NULL,
	"last_changed_at" timestamp,
	"unsubscribed_at" timestamp,
	"unsubscribe_campaign_title" text DEFAULT '' NOT NULL,
	"unsubscribe_campaign_id" varchar(120) DEFAULT '' NOT NULL,
	"unsubscribe_reason" varchar(80) DEFAULT '' NOT NULL,
	"unsubscribe_reason_other" text DEFAULT '' NOT NULL,
	"cleaned_at" timestamp,
	"clean_campaign_title" text DEFAULT '' NOT NULL,
	"clean_campaign_id" varchar(120) DEFAULT '' NOT NULL,
	"interests" json DEFAULT '[]'::json NOT NULL,
	"relationships" json DEFAULT '[]'::json NOT NULL,
	"tags" json DEFAULT '[]'::json NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"source_files" json DEFAULT '[]'::json NOT NULL,
	"raw_json" json DEFAULT '{}'::json NOT NULL,
	"imported_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mailchimp_import_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"fingerprint" varchar(64) NOT NULL,
	"source_label" varchar(160) DEFAULT 'Mailchimp export' NOT NULL,
	"status" varchar(30) DEFAULT 'running' NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"unique_contacts" integer DEFAULT 0 NOT NULL,
	"audience_count" integer DEFAULT 0 NOT NULL,
	"segment_count" integer DEFAULT 0 NOT NULL,
	"file_manifest_json" json DEFAULT '[]'::json NOT NULL,
	"summary_json" json DEFAULT '{}'::json NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mailchimp_segment_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"mailchimp_contact_id" integer NOT NULL,
	"last_import_run_id" integer NOT NULL,
	"audience_key" varchar(120) NOT NULL,
	"segment_key" varchar(120) NOT NULL,
	"segment_label" varchar(160) NOT NULL,
	"export_status" varchar(30) NOT NULL,
	"source_file_name" varchar(255) NOT NULL,
	"raw_json" json DEFAULT '{}'::json NOT NULL,
	"imported_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mailchimp_contacts" ADD CONSTRAINT "mailchimp_contacts_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailchimp_contacts" ADD CONSTRAINT "mailchimp_contacts_last_import_run_id_mailchimp_import_runs_id_fk" FOREIGN KEY ("last_import_run_id") REFERENCES "public"."mailchimp_import_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailchimp_segment_memberships" ADD CONSTRAINT "mailchimp_segment_memberships_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailchimp_segment_memberships" ADD CONSTRAINT "mailchimp_segment_memberships_mailchimp_contact_id_mailchimp_contacts_id_fk" FOREIGN KEY ("mailchimp_contact_id") REFERENCES "public"."mailchimp_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailchimp_segment_memberships" ADD CONSTRAINT "mailchimp_segment_memberships_last_import_run_id_mailchimp_import_runs_id_fk" FOREIGN KEY ("last_import_run_id") REFERENCES "public"."mailchimp_import_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mailchimp_contacts_person_audience_unique_idx" ON "mailchimp_contacts" USING btree ("person_id","audience_key");--> statement-breakpoint
CREATE INDEX "mailchimp_contacts_audience_status_idx" ON "mailchimp_contacts" USING btree ("audience_key","export_status");--> statement-breakpoint
CREATE INDEX "mailchimp_contacts_email_idx" ON "mailchimp_contacts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "mailchimp_contacts_euid_idx" ON "mailchimp_contacts" USING btree ("euid");--> statement-breakpoint
CREATE UNIQUE INDEX "mailchimp_import_runs_fingerprint_unique_idx" ON "mailchimp_import_runs" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "mailchimp_import_runs_status_started_idx" ON "mailchimp_import_runs" USING btree ("status","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "mailchimp_memberships_person_audience_segment_unique_idx" ON "mailchimp_segment_memberships" USING btree ("person_id","audience_key","segment_key");--> statement-breakpoint
CREATE INDEX "mailchimp_memberships_audience_segment_status_idx" ON "mailchimp_segment_memberships" USING btree ("audience_key","segment_key","export_status");--> statement-breakpoint
CREATE INDEX "mailchimp_memberships_contact_idx" ON "mailchimp_segment_memberships" USING btree ("mailchimp_contact_id");