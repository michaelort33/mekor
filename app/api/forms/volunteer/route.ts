import { NextResponse } from "next/server";

import { submitForm } from "@/lib/forms/submit";

export async function POST(request: Request) {
  const body = await request.json();
  const result = await submitForm("volunteer", body);

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
