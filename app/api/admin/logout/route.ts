import { NextResponse } from "next/server";

import { destroyAdminSession } from "@/lib/admin/session";
import { destroyUserSession } from "@/lib/auth/session";

export async function POST() {
  await destroyUserSession();
  await destroyAdminSession();
  return NextResponse.json({ ok: true });
}
