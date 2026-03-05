ALTER TABLE "family_invites" ALTER COLUMN "invitee_email" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "family_invites" ALTER COLUMN "invitee_email" DROP NOT NULL;