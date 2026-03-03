import { NextResponse } from "next/server";

import { renewalSubmissionInputSchema } from "@/lib/member-ops/contracts";
import { isMemberOpsEnabled } from "@/lib/member-ops/feature";
import { submitRenewalWithToken } from "@/lib/member-ops/renewals";

export async function POST(request: Request) {
  if (!isMemberOpsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = renewalSubmissionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await submitRenewalWithToken(parsed.data);
    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}
