import { NextResponse } from "next/server";

import { listRoutesBySection } from "@/lib/content/native-content";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<Record<string, string | string[] | undefined>> },
) {
  const params = await context.params;
  const rawSection = params.sectionSitemap;
  const sectionSitemap = Array.isArray(rawSection) ? rawSection[0] ?? "" : rawSection ?? "";

  const allowed = new Set([
    "blog-posts-sitemap",
    "event-pages-sitemap",
    "dynamic-news-sitemap",
    "pages-sitemap",
  ]);

  if (!allowed.has(sectionSitemap)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const selected = await listRoutesBySection(
    sectionSitemap as
      | "blog-posts-sitemap"
      | "event-pages-sitemap"
      | "dynamic-news-sitemap"
      | "pages-sitemap",
  );
  const lastmod = new Date().toISOString().slice(0, 10);

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    selected
      .map(
        (pathValue) =>
          '<url>\n' +
          '<loc>https://www.mekorhabracha.org' +
          pathValue +
          '</loc>\n' +
          '<lastmod>' +
          lastmod +
          '</lastmod>\n' +
          '</url>',
      )
      .join("\n") +
    '\n</urlset>';

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
