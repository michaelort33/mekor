ALTER TABLE "event_registrations" ADD COLUMN "share_in_feed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD COLUMN "signup_comment" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX "event_registrations_event_shared_registered_at_idx" ON "event_registrations" USING btree ("event_id","share_in_feed","registered_at");