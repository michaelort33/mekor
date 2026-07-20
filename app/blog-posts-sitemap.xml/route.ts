import { NextResponse } from "next/server";

import {
  getStaticSitemapEntries,
  serializeUrlSet,
  SITEMAP_RESPONSE_HEADERS,
} from "@/lib/seo/sitemaps";

export const dynamic = "force-static";

export async function GET() {
  return new NextResponse(serializeUrlSet(await getStaticSitemapEntries("blog-posts-sitemap")), {
    headers: SITEMAP_RESPONSE_HEADERS,
  });
}
