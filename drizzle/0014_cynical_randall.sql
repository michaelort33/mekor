CREATE TYPE "public"."family_invite_status" AS ENUM('pending', 'accepted', 'declined', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."family_join_request_status" AS ENUM('pending', 'accepted', 'declined', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."family_membership_status" AS ENUM('pending', 'active', 'former');--> statement-breakpoint
CREATE TYPE "public"."family_role_in_family" AS ENUM('primary_adult', 'adult', 'child', 'dependent');--> statement-breakpoint
CREATE TYPE "public"."family_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."inbox_message_type" AS ENUM('text', 'system', 'action');--> statement-breakpoint
CREATE TYPE "public"."inbox_thread_type" AS ENUM('family_invite', 'family_chat', 'direct', 'system');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'sms', 'push');--> statement-breakpoint
CREATE TYPE "public"."notifications_outbox_status" AS ENUM('queued', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "families" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"created_by_user_id" integer NOT NULL,
	"status" "family_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "families_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "family_invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"family_id" integer NOT NULL,
	"thread_id" integer NOT NULL,
	"inviter_user_id" integer NOT NULL,
	"invitee_user_id" integer,
	"invitee_email" varchar(255) DEFAULT '' NOT NULL,
	"invitee_first_name" varchar(120) DEFAULT '' NOT NULL,
	"invitee_last_name" varchar(120) DEFAULT '' NOT NULL,
	"role_in_family" "family_role_in_family" DEFAULT 'adult' NOT NULL,
	"contact_required" boolean DEFAULT false NOT NULL,
	"token_hash" text NOT NULL,
	"status" "family_invite_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_join_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"family_id" integer NOT NULL,
	"requestor_user_id" integer NOT NULL,
	"requested_role_in_family" "family_role_in_family" DEFAULT 'adult' NOT NULL,
	"status" "family_join_request_status" DEFAULT 'pending' NOT NULL,
	"responded_by_user_id" integer,
	"responded_at" timestamp,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"family_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role_in_family" "family_role_in_family" DEFAULT 'adult' NOT NULL,
	"membership_status" "family_membership_status" DEFAULT 'active' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbox_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" integer NOT NULL,
	"sender_user_id" integer,
	"message_type" "inbox_message_type" DEFAULT 'text' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"action_payload_json" json DEFAULT '{}'::json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbox_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"last_read_at" timestamp,
	"muted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbox_threads" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "inbox_thread_type" NOT NULL,
	"subject" varchar(180) DEFAULT '' NOT NULL,
	"family_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications_outbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"thread_id" integer,
	"channel" "notification_channel" DEFAULT 'email' NOT NULL,
	"to_address" varchar(255) NOT NULL,
	"subject" varchar(255) DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"provider" varchar(60) DEFAULT 'sendgrid' NOT NULL,
	"provider_message_id" varchar(255) DEFAULT '' NOT NULL,
	"status" "notifications_outbox_status" DEFAULT 'queued' NOT NULL,
	"error_message" text DEFAULT '' NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "families_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_invites" ADD CONSTRAINT "family_invites_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_invites" ADD CONSTRAINT "family_invites_thread_id_inbox_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."inbox_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_invites" ADD CONSTRAINT "family_invites_inviter_user_id_users_id_fk" FOREIGN KEY ("inviter_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_invites" ADD CONSTRAINT "family_invites_invitee_user_id_users_id_fk" FOREIGN KEY ("invitee_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_join_requests" ADD CONSTRAINT "family_join_requests_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_join_requests" ADD CONSTRAINT "family_join_requests_requestor_user_id_users_id_fk" FOREIGN KEY ("requestor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_join_requests" ADD CONSTRAINT "family_join_requests_responded_by_user_id_users_id_fk" FOREIGN KEY ("responded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_thread_id_inbox_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."inbox_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_participants" ADD CONSTRAINT "inbox_participants_thread_id_inbox_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."inbox_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_participants" ADD CONSTRAINT "inbox_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_threads" ADD CONSTRAINT "inbox_threads_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications_outbox" ADD CONSTRAINT "notifications_outbox_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications_outbox" ADD CONSTRAINT "notifications_outbox_thread_id_inbox_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."inbox_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "families_status_created_at_idx" ON "families" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "family_invites_token_hash_unique_idx" ON "family_invites" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "family_invites_family_invitee_email_status_unique_idx" ON "family_invites" USING btree ("family_id","invitee_email","status");--> statement-breakpoint
CREATE INDEX "family_invites_family_invitee_status_idx" ON "family_invites" USING btree ("family_id","invitee_user_id","status");--> statement-breakpoint
CREATE INDEX "family_invites_invitee_email_status_idx" ON "family_invites" USING btree ("invitee_email","status");--> statement-breakpoint
CREATE INDEX "family_invites_expires_at_idx" ON "family_invites" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "family_join_requests_family_requestor_status_idx" ON "family_join_requests" USING btree ("family_id","requestor_user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "family_members_family_user_unique_idx" ON "family_members" USING btree ("family_id","user_id");--> statement-breakpoint
CREATE INDEX "family_members_user_status_family_idx" ON "family_members" USING btree ("user_id","membership_status","family_id");--> statement-breakpoint
CREATE INDEX "family_members_family_status_role_idx" ON "family_members" USING btree ("family_id","membership_status","role_in_family");--> statement-breakpoint
CREATE INDEX "inbox_messages_thread_created_at_idx" ON "inbox_messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "inbox_participants_thread_user_unique_idx" ON "inbox_participants" USING btree ("thread_id","user_id");--> statement-breakpoint
CREATE INDEX "inbox_participants_user_thread_idx" ON "inbox_participants" USING btree ("user_id","thread_id");--> statement-breakpoint
CREATE INDEX "inbox_threads_family_type_idx" ON "inbox_threads" USING btree ("family_id","type");--> statement-breakpoint
CREATE INDEX "notifications_outbox_status_created_at_idx" ON "notifications_outbox" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "notifications_outbox_user_created_at_idx" ON "notifications_outbox" USING btree ("user_id","created_at");