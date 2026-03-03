import { NextResponse } from "next/server";

import { isMemberOpsEnabled } from "@/lib/member-ops/feature";
import { createMessageRequest, listConnectRecipients } from "@/lib/member-ops/messaging";
import { memberMessageRequestInputSchema } from "@/lib/member-ops/contracts";

export async function GET() {
  if (!isMemberOpsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const recipients = await listConnectRecipients();
  return NextResponse.json({ recipients }, { status: 200 });
}

export async function POST(request: Request) {
  if (!isMemberOpsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = memberMessageRequestInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const created = await createMessageRequest(parsed.data);
    return NextResponse.json({ ok: true, request: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}
