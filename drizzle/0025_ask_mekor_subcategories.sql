CREATE TABLE "ask_mekor_subcategories" (
  "id" serial PRIMARY KEY NOT NULL,
  "category_id" integer NOT NULL REFERENCES "ask_mekor_categories"("id"),
  "slug" varchar(80) NOT NULL,
  "label" varchar(120) NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "position" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "ask_mekor_subcategories_category_position_idx"
  ON "ask_mekor_subcategories" ("category_id", "position");

CREATE UNIQUE INDEX "ask_mekor_subcategories_category_slug_unique_idx"
  ON "ask_mekor_subcategories" ("category_id", "slug");

ALTER TABLE "ask_mekor_questions"
ADD COLUMN "subcategory_id" integer REFERENCES "ask_mekor_subcategories"("id");

CREATE INDEX "ask_mekor_questions_subcategory_updated_idx"
  ON "ask_mekor_questions" ("subcategory_id", "updated_at");
