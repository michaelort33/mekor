import { NextResponse } from "next/server";

function getErrorMessages(error: unknown) {
  const messages: string[] = [];
  let current: unknown = error;

  for (let index = 0; index < 4 && current instanceof Error; index += 1) {
    messages.push(current.message.toLowerCase());
    current = current.cause;
  }

  return messages.join(" ");
}

function isEventSignupSchemaError(error: unknown) {
  const message = getErrorMessages(error);
  if (!message) {
    return false;
  }

  const missingRelation =
    message.includes("relation") &&
    message.includes("does not exist") &&
    (message.includes("event_registration") ||
      message.includes("event_signup_settings") ||
      message.includes("event_ticket_tiers"));

  const missingColumn =
    message.includes("column") &&
    message.includes("does not exist") &&
    (message.includes("event_registration") ||
      message.includes("share_in_feed") ||
      message.includes("signup_comment"));

  return missingRelation || missingColumn;
}

export function eventSignupErrorResponse(error: unknown) {
  if (isEventSignupSchemaError(error)) {
    return NextResponse.json(
      {
        error: "Event signup is temporarily unavailable. Please ask an admin to run the latest database migration.",
        code: "EVENT_SIGNUP_SCHEMA_MISSING",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ error: "Unexpected event signup error" }, { status: 500 });
}
