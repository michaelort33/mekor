CREATE TYPE "public"."payment_campaign_status" AS ENUM('draft', 'active', 'closed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."payment_classification_status" AS ENUM('unreconciled', 'auto_matched', 'manually_matched');--> statement-breakpoint
CREATE TYPE "public"."payment_kind" AS ENUM('donation', 'membership_dues', 'campaign_donation', 'event', 'goods_services', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_source" AS ENUM('stripe', 'paypal', 'zelle', 'flipcause', 'network_for_good', 'chesed', 'manual', 'other');--> statement-breakpoint
CREATE TYPE "public"."tax_deductibility" AS ENUM('deductible', 'partially_deductible', 'non_deductible');--> statement-breakpoint
CREATE TYPE "public"."tax_document_type" AS ENUM('receipt', 'year_end_letter');--> statement-breakpoint
ALTER TYPE "public"."people_status" ADD VALUE 'guest' BEFORE 'member';--> statement-breakpoint
CREATE TABLE "payment_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_by_user_id" integer NOT NULL,
	"title" varchar(180) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"designation_label" varchar(160) DEFAULT 'General donation' NOT NULL,
	"target_amount_cents" integer,
	"suggested_amount_cents" integer,
	"status" "payment_campaign_status" DEFAULT 'draft' NOT NULL,
	"shareable_path" varchar(255) NOT NULL,
	"launched_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_campaigns_slug_unique" UNIQUE("slug"),
	CONSTRAINT "payment_campaigns_shareable_path_unique" UNIQUE("shareable_path")
);
--> statement-breakpoint
CREATE TABLE "payments_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer,
	"user_id" integer,
	"family_id" integer,
	"dues_invoice_id" integer,
	"membership_application_id" integer,
	"event_registration_id" integer,
	"campaign_id" integer,
	"source" "payment_source" DEFAULT 'manual' NOT NULL,
	"source_label" varchar(120) DEFAULT '' NOT NULL,
	"external_payment_id" varchar(255) DEFAULT '' NOT NULL,
	"external_reference" varchar(255) DEFAULT '' NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"kind" "payment_kind" DEFAULT 'donation' NOT NULL,
	"classification_status" "payment_classification_status" DEFAULT 'unreconciled' NOT NULL,
	"tax_deductibility" "tax_deductibility" DEFAULT 'deductible' NOT NULL,
	"amount_cents" integer NOT NULL,
	"deductible_amount_cents" integer DEFAULT 0 NOT NULL,
	"goods_services_value_cents" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'usd' NOT NULL,
	"designation" varchar(180) DEFAULT 'General donation' NOT NULL,
	"payer_display_name" varchar(180) DEFAULT '' NOT NULL,
	"payer_email" varchar(255) DEFAULT '' NOT NULL,
	"payer_phone" varchar(60) DEFAULT '' NOT NULL,
	"thank_you_template_version" varchar(60) DEFAULT 'v1' NOT NULL,
	"receipt_number" varchar(80) DEFAULT '' NOT NULL,
	"receipt_url" text DEFAULT '' NOT NULL,
	"receipt_generated_at" timestamp,
	"year_end_letter_url" text DEFAULT '' NOT NULL,
	"year_end_letter_generated_at" timestamp,
	"notes" text DEFAULT '' NOT NULL,
	"metadata_json" json DEFAULT '{}'::json NOT NULL,
	"paid_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer,
	"family_id" integer,
	"payment_id" integer,
	"document_type" "tax_document_type" NOT NULL,
	"tax_year" integer,
	"title" varchar(180) NOT NULL,
	"document_number" varchar(80) NOT NULL,
	"file_url" text DEFAULT '' NOT NULL,
	"payload_json" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tax_documents_document_number_unique" UNIQUE("document_number")
);
--> statement-breakpoint
ALTER TABLE "payment_campaigns" ADD CONSTRAINT "payment_campaigns_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments_ledger" ADD CONSTRAINT "payments_ledger_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments_ledger" ADD CONSTRAINT "payments_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments_ledger" ADD CONSTRAINT "payments_ledger_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments_ledger" ADD CONSTRAINT "payments_ledger_dues_invoice_id_dues_invoices_id_fk" FOREIGN KEY ("dues_invoice_id") REFERENCES "public"."dues_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments_ledger" ADD CONSTRAINT "payments_ledger_membership_application_id_membership_applications_id_fk" FOREIGN KEY ("membership_application_id") REFERENCES "public"."membership_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments_ledger" ADD CONSTRAINT "payments_ledger_event_registration_id_event_registrations_id_fk" FOREIGN KEY ("event_registration_id") REFERENCES "public"."event_registrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments_ledger" ADD CONSTRAINT "payments_ledger_campaign_id_payment_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."payment_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_documents" ADD CONSTRAINT "tax_documents_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_documents" ADD CONSTRAINT "tax_documents_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_documents" ADD CONSTRAINT "tax_documents_payment_id_payments_ledger_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments_ledger"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_campaigns_status_launched_idx" ON "payment_campaigns" USING btree ("status","launched_at");--> statement-breakpoint
CREATE INDEX "payment_campaigns_created_by_status_idx" ON "payment_campaigns" USING btree ("created_by_user_id","status");--> statement-breakpoint
CREATE INDEX "payments_ledger_person_paid_at_idx" ON "payments_ledger" USING btree ("person_id","paid_at");--> statement-breakpoint
CREATE INDEX "payments_ledger_family_paid_at_idx" ON "payments_ledger" USING btree ("family_id","paid_at");--> statement-breakpoint
CREATE INDEX "payments_ledger_user_paid_at_idx" ON "payments_ledger" USING btree ("user_id","paid_at");--> statement-breakpoint
CREATE INDEX "payments_ledger_campaign_paid_at_idx" ON "payments_ledger" USING btree ("campaign_id","paid_at");--> statement-breakpoint
CREATE INDEX "payments_ledger_source_status_paid_at_idx" ON "payments_ledger" USING btree ("source","status","paid_at");--> statement-breakpoint
CREATE INDEX "payments_ledger_classification_paid_at_idx" ON "payments_ledger" USING btree ("classification_status","paid_at");--> statement-breakpoint
CREATE INDEX "payments_ledger_external_source_idx" ON "payments_ledger" USING btree ("source","external_payment_id");--> statement-breakpoint
CREATE INDEX "tax_documents_person_type_year_idx" ON "tax_documents" USING btree ("person_id","document_type","tax_year");--> statement-breakpoint
CREATE INDEX "tax_documents_family_type_year_idx" ON "tax_documents" USING btree ("family_id","document_type","tax_year");--> statement-breakpoint
CREATE INDEX "tax_documents_payment_type_idx" ON "tax_documents" USING btree ("payment_id","document_type");