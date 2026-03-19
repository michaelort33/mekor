CREATE TYPE "public"."ask_mekor_question_visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "public"."ask_mekor_question_status" AS ENUM('open', 'answered', 'closed');--> statement-breakpoint
CREATE TABLE "ask_mekor_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(80) NOT NULL,
	"label" varchar(120) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ask_mekor_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"visibility" "ask_mekor_question_visibility" DEFAULT 'public' NOT NULL,
	"status" "ask_mekor_question_status" DEFAULT 'open' NOT NULL,
	"slug" varchar(200) NOT NULL,
	"title" varchar(180) NOT NULL,
	"body" text NOT NULL,
	"asker_user_id" integer,
	"asker_name" varchar(120) DEFAULT '' NOT NULL,
	"asker_email" varchar(255) DEFAULT '' NOT NULL,
	"asker_phone" varchar(60) DEFAULT '' NOT NULL,
	"source_path" varchar(512) DEFAULT '/ask-mekor' NOT NULL,
	"linked_thread_id" integer,
	"answered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ask_mekor_replies" (
	"id" serial PRIMARY KEY NOT NULL,
	"question_id" integer NOT NULL,
	"author_user_id" integer NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ask_mekor_questions" ADD CONSTRAINT "ask_mekor_questions_category_id_ask_mekor_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."ask_mekor_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ask_mekor_questions" ADD CONSTRAINT "ask_mekor_questions_asker_user_id_users_id_fk" FOREIGN KEY ("asker_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ask_mekor_questions" ADD CONSTRAINT "ask_mekor_questions_linked_thread_id_inbox_threads_id_fk" FOREIGN KEY ("linked_thread_id") REFERENCES "public"."inbox_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ask_mekor_replies" ADD CONSTRAINT "ask_mekor_replies_question_id_ask_mekor_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."ask_mekor_questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ask_mekor_replies" ADD CONSTRAINT "ask_mekor_replies_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ask_mekor_categories_slug_unique_idx" ON "ask_mekor_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "ask_mekor_categories_position_idx" ON "ask_mekor_categories" USING btree ("position");--> statement-breakpoint
CREATE UNIQUE INDEX "ask_mekor_questions_slug_unique_idx" ON "ask_mekor_questions" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "ask_mekor_questions_visibility_status_updated_idx" ON "ask_mekor_questions" USING btree ("visibility","status","updated_at");--> statement-breakpoint
CREATE INDEX "ask_mekor_questions_category_updated_idx" ON "ask_mekor_questions" USING btree ("category_id","updated_at");--> statement-breakpoint
CREATE INDEX "ask_mekor_questions_asker_email_created_idx" ON "ask_mekor_questions" USING btree ("asker_email","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ask_mekor_questions_linked_thread_unique_idx" ON "ask_mekor_questions" USING btree ("linked_thread_id");--> statement-breakpoint
CREATE INDEX "ask_mekor_replies_question_created_idx" ON "ask_mekor_replies" USING btree ("question_id","created_at");--> statement-breakpoint
