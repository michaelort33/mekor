import { NextResponse } from "next/server";

import { listPublicMemberProfiles } from "@/lib/members/store";
import { getPublicViewerContext } from "@/lib/members/viewer";

export async function GET() {
  const viewer = await getPublicViewerContext();
  const profiles = await listPublicMemberProfiles(viewer);
  return NextResponse.json({ profiles });
}
