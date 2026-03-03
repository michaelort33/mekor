import { NextResponse } from "next/server";

import { ensureAdminApiSession } from "@/lib/admin/guard";
import { isMemberOpsEnabled } from "@/lib/member-ops/feature";
import { relayMessageFromAdmin } from "@/lib/member-ops/messaging";
import { memberMessageRelayInputSchema } from "@/lib/member-ops/contracts";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  if (!isMemberOpsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const auth = await ensureAdminApiSession();
  if (auth) {
    return auth;
  }

  const { id } = await context.params;
  const requestId = Number.parseInt(id, 10);
  if (!Number.isFinite(requestId) || requestId <= 0) {
    return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = memberMessageRelayInputSchema.safeParse({
    ...body,
    requestId,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const relay = await relayMessageFromAdmin(parsed.data);
    return NextResponse.json({ ok: true, relay }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}
