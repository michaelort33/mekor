import { NextResponse } from "next/server";

import { MemberEventServiceError } from "@/lib/member-events/service";

function getErrorMessages(error: unknown) {
  const messages: string[] = [];
  let current: unknown = error;

  for (let index = 0; index < 4 && current instanceof Error; index += 1) {
    messages.push(current.message.toLowerCase());
    current = current.cause;
  }

  return messages.join(" ");
}

function isMissingSchemaError(error: unknown) {
  const message = getErrorMessages(error);
  if (!message) {
    return false;
  }

  return (
    message.includes("relation") &&
    message.includes("does not exist") &&
    (message.includes("member_event") || message.includes("inbox_"))
  );
}

export function memberEventsServiceErrorResponse(error: unknown) {
  if (error instanceof MemberEventServiceError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }

  if (isMissingSchemaError(error)) {
    return NextResponse.json(
      {
        error: "Member events are temporarily unavailable. Please ask an admin to run the latest database migration.",
        code: "MEMBER_EVENTS_SCHEMA_MISSING",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ error: "Unexpected member event error" }, { status: 500 });
}
