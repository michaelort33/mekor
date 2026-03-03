import { NextResponse } from "next/server";

import { submitForm, type SubmitFormHandler } from "@/lib/forms/submit";

export async function handleEventAskPost(
  request: Request,
  submit: SubmitFormHandler = submitForm,
) {
  const body = await request.json();
  const result = await submit("event-ask", body);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        issues: result.issues,
      },
      { status: result.status },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      submissionId: result.submissionId,
      redirectTo: result.redirectTo,
    },
    { status: result.status },
  );
}

export async function POST(request: Request) {
  return handleEventAskPost(request);
}
