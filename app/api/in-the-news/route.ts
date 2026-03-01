import { NextRequest, NextResponse } from "next/server";

import { getManagedInTheNews } from "@/lib/in-the-news/store";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const articles = await getManagedInTheNews({
    search: searchParams.get("q") ?? "",
    publication: searchParams.get("publication") ?? "all",
    year: searchParams.get("year") ?? "all",
  });

  return NextResponse.json({ articles }, { status: 200 });
}
