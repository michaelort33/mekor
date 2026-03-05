import assert from "node:assert/strict";
import test from "node:test";

import { eventSignupErrorResponse } from "../lib/events/http";

test("event signup http mapper returns 503 for missing schema relation", async () => {
  const response = eventSignupErrorResponse(new Error('relation "event_registrations" does not exist'));
  const body = (await response.json()) as { error: string; code: string };

  assert.equal(response.status, 503);
  assert.equal(body.code, "EVENT_SIGNUP_SCHEMA_MISSING");
});

test("event signup http mapper returns 503 for missing schema column", async () => {
  const response = eventSignupErrorResponse(new Error('column "share_in_feed" of relation "event_registrations" does not exist'));
  const body = (await response.json()) as { error: string; code: string };

  assert.equal(response.status, 503);
  assert.equal(body.code, "EVENT_SIGNUP_SCHEMA_MISSING");
});

test("event signup http mapper returns 503 for wrapped query errors", async () => {
  const response = eventSignupErrorResponse(
    new Error("Failed query", {
      cause: new Error('column "share_in_feed" of relation "event_registrations" does not exist'),
    }),
  );
  const body = (await response.json()) as { error: string; code: string };

  assert.equal(response.status, 503);
  assert.equal(body.code, "EVENT_SIGNUP_SCHEMA_MISSING");
});

test("event signup http mapper returns generic error for unknown failures", async () => {
  const response = eventSignupErrorResponse(new Error("something else"));
  const body = (await response.json()) as { error: string };

  assert.equal(response.status, 500);
  assert.equal(body.error, "Unexpected event signup error");
});
