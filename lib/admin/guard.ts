import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin/session";

export async function ensureAdminApiSession() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
