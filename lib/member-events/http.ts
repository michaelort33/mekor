import { NextResponse } from "next/server";

import { MemberEventServiceError } from "@/lib/member-events/service";

function isMissingSchemaError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
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
