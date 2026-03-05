import { NextResponse } from "next/server";

import { getUserSession } from "@/lib/auth/session";
import { getMemberHostStats } from "@/lib/member-events/service";

export async function GET() {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = await getMemberHostStats({
    userId: session.userId,
  });

  return NextResponse.json({ stats });
}
