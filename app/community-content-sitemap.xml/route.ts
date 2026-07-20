import { NextResponse } from "next/server";

import {
  getCommunityContentSitemapEntries,
  serializeUrlSet,
  SITEMAP_RESPONSE_HEADERS,
} from "@/lib/seo/sitemaps";

export const dynamic = "force-dynamic";

export async function GET() {
  return new NextResponse(serializeUrlSet(await getCommunityContentSitemapEntries()), {
    headers: SITEMAP_RESPONSE_HEADERS,
  });
}
