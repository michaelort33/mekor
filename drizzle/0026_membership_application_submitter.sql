ALTER TABLE "membership_applications"
ADD COLUMN "submitted_by_user_id" integer;
--> statement-breakpoint
ALTER TABLE "membership_applications"
ADD CONSTRAINT "membership_applications_submitted_by_user_id_users_id_fk"
FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "membership_applications_submitter_status_idx"
ON "membership_applications" USING btree ("submitted_by_user_id","status");
