import assert from "node:assert/strict";
import test from "node:test";

import { memberEventsServiceErrorResponse } from "../lib/member-events/http";
import { MemberEventServiceError } from "../lib/member-events/service";

test("member events http mapper preserves service errors", async () => {
  const response = memberEventsServiceErrorResponse(
    new MemberEventServiceError(409, "ALREADY_JOINED", "Already joined"),
  );
  const body = (await response.json()) as { error: string; code: string };

  assert.equal(response.status, 409);
  assert.equal(body.error, "Already joined");
  assert.equal(body.code, "ALREADY_JOINED");
});

test("member events http mapper returns 503 for missing schema errors", async () => {
  const response = memberEventsServiceErrorResponse(new Error('relation "member_events" does not exist'));
  const body = (await response.json()) as { error: string; code: string };

  assert.equal(response.status, 503);
  assert.equal(body.code, "MEMBER_EVENTS_SCHEMA_MISSING");
});

test("member events http mapper returns 503 for wrapped query errors", async () => {
  const response = memberEventsServiceErrorResponse(
    new Error("Failed query", { cause: new Error('relation "member_event_join_requests" does not exist') }),
  );
  const body = (await response.json()) as { error: string; code: string };

  assert.equal(response.status, 503);
  assert.equal(body.code, "MEMBER_EVENTS_SCHEMA_MISSING");
});
