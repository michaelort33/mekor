ALTER TABLE "message_suppressions" ALTER COLUMN "email" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "message_suppressions" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "message_suppressions" ALTER COLUMN "phone" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "message_suppressions" ALTER COLUMN "phone" DROP NOT NULL;