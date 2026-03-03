import { NextResponse } from "next/server";

import { memberMessageReplyInputSchema } from "@/lib/member-ops/contracts";
import { isMemberOpsEnabled } from "@/lib/member-ops/feature";
import { recordRecipientReply } from "@/lib/member-ops/messaging";

export async function POST(request: Request) {
  if (!isMemberOpsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = memberMessageReplyInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const relay = await recordRecipientReply(parsed.data);
    return NextResponse.json({ ok: true, relay }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}
