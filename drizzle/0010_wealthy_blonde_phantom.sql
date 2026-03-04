CREATE TYPE "public"."dues_notification_delivery_status" AS ENUM('sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."dues_notification_type" AS ENUM('invoice_created', 'payment_succeeded', 'payment_failed', 'overdue_d30', 'overdue_d7', 'overdue_d1', 'overdue_weekly');--> statement-breakpoint
CREATE TABLE "dues_notification_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference_key" varchar(255) NOT NULL,
	"user_id" integer NOT NULL,
	"invoice_id" integer,
	"payment_id" integer,
	"notification_type" "dues_notification_type" NOT NULL,
	"provider" varchar(40) DEFAULT 'sendgrid' NOT NULL,
	"provider_message_id" varchar(255) DEFAULT '' NOT NULL,
	"delivery_status" "dues_notification_delivery_status" NOT NULL,
	"error_message" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dues_notification_log_reference_key_unique" UNIQUE("reference_key")
);
--> statement-breakpoint
ALTER TABLE "dues_notification_log" ADD CONSTRAINT "dues_notification_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dues_notification_log" ADD CONSTRAINT "dues_notification_log_invoice_id_dues_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."dues_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dues_notification_log" ADD CONSTRAINT "dues_notification_log_payment_id_dues_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."dues_payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dues_notification_log_invoice_type_idx" ON "dues_notification_log" USING btree ("invoice_id","notification_type");--> statement-breakpoint
CREATE INDEX "dues_notification_log_payment_type_idx" ON "dues_notification_log" USING btree ("payment_id","notification_type");--> statement-breakpoint
CREATE INDEX "dues_invoices_due_date_id_idx" ON "dues_invoices" USING btree ("due_date","id");--> statement-breakpoint
CREATE INDEX "dues_schedules_updated_at_id_idx" ON "dues_schedules" USING btree ("updated_at","id");--> statement-breakpoint
CREATE INDEX "event_registrations_registered_at_id_idx" ON "event_registrations" USING btree ("registered_at","id");--> statement-breakpoint
CREATE INDEX "user_invitations_created_at_id_idx" ON "user_invitations" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "users_created_at_id_idx" ON "users" USING btree ("created_at","id");