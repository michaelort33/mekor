import { NextResponse } from "next/server";

import { getPublicMemberProfileBySlug } from "@/lib/members/store";
import { getPublicViewerContext } from "@/lib/members/viewer";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const viewer = await getPublicViewerContext();
  const profile = await getPublicMemberProfileBySlug(slug, viewer);

  if (!profile) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  return NextResponse.json({ profile });
}
