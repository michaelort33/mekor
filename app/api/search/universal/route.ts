import { NextResponse } from "next/server";

import { searchUniversalDocuments } from "@/lib/search/universal";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const limitRaw = Number(searchParams.get("limit") ?? "12");
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 20)) : 12;

  const results = await searchUniversalDocuments(query, limit);
  return NextResponse.json({ results });
}
