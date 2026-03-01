import { NextRequest, NextResponse } from "next/server";

import { getManagedKosherPlaces } from "@/lib/kosher/store";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const places = await getManagedKosherPlaces({
    search: searchParams.get("q") ?? "",
    neighborhood: searchParams.get("neighborhood") ?? "all",
    tag: searchParams.get("tag") ?? "all",
  });

  return NextResponse.json({ places }, { status: 200 });
}
