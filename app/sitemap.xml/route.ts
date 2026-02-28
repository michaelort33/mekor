import { NextResponse } from "next/server";

export const dynamic = "force-static";

const sections = [
  "blog-categories-sitemap.xml",
  "blog-posts-sitemap.xml",
  "event-pages-sitemap.xml",
  "dynamic-news-sitemap.xml",
  "pages-sitemap.xml",
];

export async function GET() {
  const lastmod = new Date().toISOString().slice(0, 10);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" generatedBy="MIRROR">
${sections
  .map(
    (section) => `<sitemap>
<loc>https://www.mekorhabracha.org/${section}</loc>
<lastmod>${lastmod}</lastmod>
</sitemap>`,
  )
  .join("\n")}
</sitemapindex>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
