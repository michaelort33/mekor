CREATE TYPE "renewal_status" AS ENUM('not_started', 'invited', 'form_submitted', 'payment_pending', 'active', 'on_hold');
--> statement-breakpoint
CREATE TYPE "invoice_status" AS ENUM('open', 'partially_paid', 'paid', 'waived', 'void');
--> statement-breakpoint
CREATE TYPE "comm_channel" AS ENUM('email', 'sms', 'whatsapp');
--> statement-breakpoint
CREATE TYPE "message_request_status" AS ENUM('pending_review', 'approved', 'rejected', 'closed');
--> statement-breakpoint
CREATE TYPE "volunteer_signup_status" AS ENUM('confirmed', 'waitlisted', 'cancelled');
--> statement-breakpoint

CREATE TABLE "households" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"billing_email" varchar(255) DEFAULT '' NOT NULL,
	"billing_phone" varchar(60) DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "household_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"household_id" integer NOT NULL,
	"first_name" varchar(120) NOT NULL,
	"last_name" varchar(120) DEFAULT '' NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(60) DEFAULT '' NOT NULL,
	"relationship" varchar(80) DEFAULT '' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "household_members_household_idx" ON "household_members" USING btree ("household_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "household_members_email_unique" ON "household_members" USING btree ("email");
--> statement-breakpoint

CREATE TABLE "membership_terms" (
	"id" serial PRIMARY KEY NOT NULL,
	"household_id" integer NOT NULL,
	"cycle_label" varchar(40) NOT NULL,
	"cycle_start" timestamp NOT NULL,
	"cycle_end" timestamp NOT NULL,
	"plan_label" varchar(120) DEFAULT '' NOT NULL,
	"renewal_status" "renewal_status" DEFAULT 'not_started' NOT NULL,
	"invited_at" timestamp,
	"submitted_at" timestamp,
	"activated_at" timestamp,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "membership_terms_household_cycle_unique" ON "membership_terms" USING btree ("household_id", "cycle_label");
--> statement-breakpoint
CREATE INDEX "membership_terms_household_cycle_idx" ON "membership_terms" USING btree ("household_id", "cycle_label");
--> statement-breakpoint

CREATE TABLE "dues_invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"household_id" integer NOT NULL,
	"membership_term_id" integer,
	"label" varchar(160) DEFAULT '' NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"paid_cents" integer DEFAULT 0 NOT NULL,
	"status" "invoice_status" DEFAULT 'open' NOT NULL,
	"due_date" timestamp,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "dues_invoices_household_status_due_date_idx" ON "dues_invoices" USING btree ("household_id", "status", "due_date");
--> statement-breakpoint

CREATE TABLE "dues_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"household_id" integer NOT NULL,
	"invoice_id" integer,
	"amount_cents" integer NOT NULL,
	"paid_at" timestamp DEFAULT now() NOT NULL,
	"method" varchar(60) DEFAULT '' NOT NULL,
	"reference" varchar(120) DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "dues_payments_household_idx" ON "dues_payments" USING btree ("household_id");
--> statement-breakpoint
CREATE INDEX "dues_payments_invoice_idx" ON "dues_payments" USING btree ("invoice_id");
--> statement-breakpoint

CREATE TABLE "communication_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"channel" "comm_channel" NOT NULL,
	"opt_in" boolean DEFAULT false NOT NULL,
	"consent_captured_at" timestamp,
	"source" varchar(80) DEFAULT 'member_form' NOT NULL,
	"updated_by" varchar(120) DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "communication_preferences_member_channel_unique" ON "communication_preferences" USING btree ("member_id", "channel");
--> statement-breakpoint

CREATE TABLE "volunteer_opportunities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "volunteer_opportunities_name_unique" UNIQUE("name")
);
--> statement-breakpoint

CREATE TABLE "volunteer_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"opportunity_id" integer NOT NULL,
	"label" varchar(180) NOT NULL,
	"start_at" timestamp NOT NULL,
	"end_at" timestamp,
	"capacity" integer DEFAULT 1 NOT NULL,
	"signup_open" boolean DEFAULT true NOT NULL,
	"location" varchar(255) DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "volunteer_slots_start_open_idx" ON "volunteer_slots" USING btree ("start_at", "signup_open");
--> statement-breakpoint

CREATE TABLE "volunteer_slot_signups" (
	"id" serial PRIMARY KEY NOT NULL,
	"slot_id" integer NOT NULL,
	"member_id" integer,
	"name" varchar(120) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(60) DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"status" "volunteer_signup_status" DEFAULT 'confirmed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "volunteer_slot_signups_slot_email_unique" ON "volunteer_slot_signups" USING btree ("slot_id", "email");
--> statement-breakpoint
CREATE INDEX "volunteer_slot_signups_slot_idx" ON "volunteer_slot_signups" USING btree ("slot_id");
--> statement-breakpoint

CREATE TABLE "committee_interests" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer,
	"name" varchar(120) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(60) DEFAULT '' NOT NULL,
	"committee" varchar(120) NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "committee_interests_committee_idx" ON "committee_interests" USING btree ("committee");
--> statement-breakpoint

CREATE TABLE "event_rsvps" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_path" varchar(512) NOT NULL,
	"event_slug" varchar(255) NOT NULL,
	"event_title" varchar(255) DEFAULT '' NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(60) DEFAULT '' NOT NULL,
	"attendee_count" integer DEFAULT 1 NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"source_path" varchar(512) DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "event_rsvps_event_path_created_idx" ON "event_rsvps" USING btree ("event_path", "created_at");
--> statement-breakpoint

CREATE TABLE "member_message_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_member_id" integer,
	"sender_name" varchar(120) NOT NULL,
	"sender_email" varchar(255) NOT NULL,
	"sender_phone" varchar(60) DEFAULT '' NOT NULL,
	"recipient_member_id" integer NOT NULL,
	"recipient_display_name" varchar(255) NOT NULL,
	"subject" varchar(255) DEFAULT '' NOT NULL,
	"message" text NOT NULL,
	"status" "message_request_status" DEFAULT 'pending_review' NOT NULL,
	"admin_note" text DEFAULT '' NOT NULL,
	"approved_at" timestamp,
	"rejected_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "member_message_requests_status_created_idx" ON "member_message_requests" USING btree ("status", "created_at");
--> statement-breakpoint

CREATE TABLE "member_message_relays" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"direction" varchar(40) NOT NULL,
	"from_role" varchar(40) NOT NULL,
	"to_role" varchar(40) NOT NULL,
	"to_email" varchar(255) NOT NULL,
	"subject" varchar(255) DEFAULT '' NOT NULL,
	"message" text NOT NULL,
	"delivery_status" varchar(40) DEFAULT 'queued' NOT NULL,
	"error_message" varchar(512) DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "member_message_relays_request_created_idx" ON "member_message_relays" USING btree ("request_id", "created_at");
--> statement-breakpoint

CREATE TABLE "household_access_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"household_id" integer NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"purpose" varchar(40) DEFAULT 'renewal' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "household_access_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE INDEX "household_access_tokens_household_purpose_idx" ON "household_access_tokens" USING btree ("household_id", "purpose");
