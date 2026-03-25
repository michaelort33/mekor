ALTER TABLE "users"
ADD COLUMN "profile_details_json" json DEFAULT '{"school":"","occupation":"","interests":"","hobbies":"","funFacts":""}'::json NOT NULL;
--> statement-breakpoint
ALTER TABLE "users"
ADD COLUMN "profile_field_visibility_json" json DEFAULT '{}'::json NOT NULL;
