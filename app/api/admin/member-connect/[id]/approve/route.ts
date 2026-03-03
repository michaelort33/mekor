import { NextResponse } from "next/server";

import { ensureAdminApiSession } from "@/lib/admin/guard";
import { isMemberOpsEnabled } from "@/lib/member-ops/feature";
import { approveMessageRequest } from "@/lib/member-ops/messaging";

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

  const body = await request.json().catch(() => ({}));
  const adminNote = typeof body.adminNote === "string" ? body.adminNote.slice(0, 2000) : "";

  try {
    const updated = await approveMessageRequest(requestId, adminNote);
    return NextResponse.json({ ok: true, request: updated }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}
