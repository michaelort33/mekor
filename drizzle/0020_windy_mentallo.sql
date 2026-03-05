CREATE TYPE "public"."membership_application_status" AS ENUM('pending', 'approved', 'declined');--> statement-breakpoint
CREATE TABLE "membership_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" "membership_application_status" DEFAULT 'pending' NOT NULL,
	"application_type" varchar(40) NOT NULL,
	"membership_category" varchar(40) NOT NULL,
	"preferred_payment_method" varchar(40) DEFAULT 'undecided' NOT NULL,
	"include_security_donation" boolean DEFAULT true NOT NULL,
	"cover_online_fees" boolean DEFAULT false NOT NULL,
	"total_amount_cents" integer DEFAULT 0 NOT NULL,
	"first_name" varchar(120) DEFAULT '' NOT NULL,
	"last_name" varchar(120) DEFAULT '' NOT NULL,
	"display_name" varchar(160) DEFAULT '' NOT NULL,
	"hebrew_name" varchar(120) DEFAULT '' NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(60) DEFAULT '' NOT NULL,
	"address_line_1" varchar(160) DEFAULT '' NOT NULL,
	"address_line_2" varchar(160) DEFAULT '' NOT NULL,
	"city" varchar(120) DEFAULT '' NOT NULL,
	"state" varchar(80) DEFAULT '' NOT NULL,
	"postal_code" varchar(20) DEFAULT '' NOT NULL,
	"spouse_first_name" varchar(120) DEFAULT '' NOT NULL,
	"spouse_last_name" varchar(120) DEFAULT '' NOT NULL,
	"spouse_hebrew_name" varchar(120) DEFAULT '' NOT NULL,
	"spouse_email" varchar(255) DEFAULT '' NOT NULL,
	"spouse_phone" varchar(60) DEFAULT '' NOT NULL,
	"household_members_json" json DEFAULT '[]'::json NOT NULL,
	"yahrzeits_json" json DEFAULT '[]'::json NOT NULL,
	"volunteer_interests_json" json DEFAULT '[]'::json NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"review_notes" text DEFAULT '' NOT NULL,
	"source_path" varchar(512) DEFAULT '/membership/apply' NOT NULL,
	"payload_json" json DEFAULT '{}'::json NOT NULL,
	"reviewed_at" timestamp,
	"reviewed_by_user_id" integer,
	"approved_person_id" integer,
	"invitation_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "membership_applications" ADD CONSTRAINT "membership_applications_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_applications" ADD CONSTRAINT "membership_applications_approved_person_id_people_id_fk" FOREIGN KEY ("approved_person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_applications" ADD CONSTRAINT "membership_applications_invitation_id_user_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."user_invitations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "membership_applications_status_created_at_idx" ON "membership_applications" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "membership_applications_email_created_at_idx" ON "membership_applications" USING btree ("email","created_at");--> statement-breakpoint
CREATE INDEX "membership_applications_reviewer_status_idx" ON "membership_applications" USING btree ("reviewed_by_user_id","status");