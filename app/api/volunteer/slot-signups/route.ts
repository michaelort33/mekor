import { NextResponse } from "next/server";

import { isMemberOpsEnabled } from "@/lib/member-ops/feature";
import { signupVolunteerSlot } from "@/lib/member-ops/volunteer";
import { volunteerSlotSignupInputSchema } from "@/lib/member-ops/contracts";

export async function POST(request: Request) {
  if (!isMemberOpsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = volunteerSlotSignupInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const signup = await signupVolunteerSlot(parsed.data);
    return NextResponse.json({ ok: true, signup }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}
