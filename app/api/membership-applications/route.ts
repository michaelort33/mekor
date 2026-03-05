import { NextResponse } from "next/server";

import { createMembershipApplication } from "@/lib/membership/application-service";
import { membershipApplicationSchema } from "@/lib/membership/applications";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const parsed = membershipApplicationSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const created = await createMembershipApplication(parsed.data);
  return NextResponse.json(
    {
      ok: true,
      applicationId: created.applicationId,
      submittedAt: created.createdAt.toISOString(),
    },
    { status: 201 },
  );
}
