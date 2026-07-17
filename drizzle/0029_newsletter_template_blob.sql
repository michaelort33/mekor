ALTER TABLE "newsletter_templates" ADD COLUMN "active_blob_pathname" varchar(512);
--> statement-breakpoint
ALTER TABLE "newsletter_templates" ADD COLUMN "active_blob_url" text;
--> statement-breakpoint
ALTER TABLE "newsletter_templates" ADD COLUMN "active_blob_version_id" varchar(255);
