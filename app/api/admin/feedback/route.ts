import { NextResponse } from "next/server";

import { requireAdminActor } from "@/lib/admin/actor";
import { listSuggestionsForAdmin } from "@/lib/feedback/service";
import { parsePageLimit } from "@/lib/pagination/cursor";

export async function GET(request: Request) {
  const adminResult = await requireAdminActor();
  if ("error" in adminResult) return adminResult.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status")?.trim() ?? "";
  const kind = searchParams.get("kind")?.trim() ?? "";
  const limit = parsePageLimit(searchParams.get("limit"));
  const cursorRaw = searchParams.get("cursor");
  const cursor = cursorRaw ? Number.parseInt(cursorRaw, 10) : null;

  const result = await listSuggestionsForAdmin({
    q,
    status,
    kind,
    limit,
    cursor: Number.isInteger(cursor) ? cursor : null,
  });

  return NextResponse.json(result);
}
