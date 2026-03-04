CREATE TABLE "admin_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_user_id" integer NOT NULL,
	"action" varchar(120) NOT NULL,
	"target_type" varchar(80) NOT NULL,
	"target_id" varchar(120) NOT NULL,
	"payload_json" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'visitor' NOT NULL,
	"invited_by_user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_log_actor_action_idx" ON "admin_audit_log" USING btree ("actor_user_id","action");--> statement-breakpoint
CREATE UNIQUE INDEX "user_invitations_token_hash_unique_idx" ON "user_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "user_invitations_email_accepted_revoked_idx" ON "user_invitations" USING btree ("email","accepted_at","revoked_at");--> statement-breakpoint
CREATE INDEX "user_invitations_expires_at_idx" ON "user_invitations" USING btree ("expires_at");