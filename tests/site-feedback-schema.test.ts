import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("site feedback schema defines sessions and suggestions tables", async () => {
  const schema = await readFile("db/schema.ts", "utf8");

  assert.match(schema, /export const siteSuggestionKindEnum = pgEnum\("site_suggestion_kind"/);
  assert.match(schema, /"suggestion"/);
  assert.match(schema, /"feedback"/);
  assert.match(schema, /"bug"/);
  assert.match(schema, /"praise"/);
  assert.match(schema, /"other"/);
  assert.match(schema, /export const siteSuggestionStatusEnum = pgEnum\("site_suggestion_status"/);
  assert.match(schema, /\["new", "reviewed", "archived"\]/);
  assert.match(schema, /export const siteFeedbackSessions = pgTable\(\s*"site_feedback_sessions"/);
  assert.match(schema, /export const siteSuggestions = pgTable\(\s*"site_suggestions"/);
  assert.match(schema, /publicId: varchar\("public_id"/);
  assert.match(schema, /transcriptJson: json\("transcript_json"\)/);
  assert.match(schema, /categoryDetail: varchar\("category_detail"/);
  assert.match(schema, /adminNotes: text\("admin_notes"\)/);
});

test("site feedback migration creates enums and tables", async () => {
  const migration = await readFile("drizzle/0029_site_suggestions_feedback.sql", "utf8");
  const journal = await readFile("drizzle/meta/_journal.json", "utf8");

  assert.match(migration, /CREATE TYPE "public"\."site_suggestion_kind"/);
  assert.match(migration, /CREATE TABLE "site_feedback_sessions"/);
  assert.match(migration, /CREATE TABLE "site_suggestions"/);
  assert.match(migration, /site_feedback_sessions_public_id_unique_idx/);
  assert.match(journal, /0029_site_suggestions_feedback/);
});
