import { NextResponse } from "next/server";

import { listPublicProfileSlugsForSitemap } from "@/lib/members/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const lastmod = new Date().toISOString().slice(0, 10);
  const slugs = process.env.DATABASE_URL ? await listPublicProfileSlugsForSitemap() : [];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${slugs
  .map(
    (slug) => `<url>
<loc>https://www.mekorhabracha.org/members/${slug}</loc>
<lastmod>${lastmod}</lastmod>
</url>`,
  )
  .join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
